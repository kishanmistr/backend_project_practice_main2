import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteImageFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import  jwt from 'jsonwebtoken'

const registerUser = asyncHandler( async(req,res) => {

        
    const { username,fullName,email,password } = req.body

    if([username,fullName,email,password].some((field) => field?.trim() === '' ) ) {

        throw  new ApiError(401,"All field is required")

    }

    const existedUser = await User.findOne({

        $or : [{username},{email}]

    })

   if(existedUser) {

     throw  new  ApiError(409, " user with email or username already exist ")

   }

   const avatarLocalPath = req.files?.avatar?.[0]?.path ;

   if(!avatarLocalPath) {

        throw  new ApiError(400, " avatar file is required " )

   }

   let coverImageLocalPath 
   if(req.files && Array.isArray(req.files?.coverImage) && req.files?.coverImage?.length > 0 ) {

        coverImageLocalPath = req.files?.coverImage?.[0]?.path 

   }

   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null ;

   const user = await User.create({

    fullName,
    username : username.toLowerCase(),
    email,
    password,
    avatar : avatar.url,
    coverImage :  coverImage ? coverImage.url : "",

   })

   const createdUser = await User.findById(user._id).select("-password -refreshToken") ;

   if(!createdUser) {

        throw  new  ApiError(500, "something went wrong while registering user")

   }

   return  res.status(201).json( new ApiResponse(200,createdUser, " user register successfully " ) )





} )

const generateAccessAndRefreshToken = async (userId) => {

    try {


        const user = await User.findById(userId);
    
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        user.save({ validateBeforeSave : false })
    
        return { accessToken,refreshToken }


    } 
    
    catch (error) {

        throw  new ApiError(400 ," error while generating access and refresh token  " , error )
        
    }

}

const loginUser = asyncHandler( async(req,res) => {

    const { username,email, password } = req.body

    if(!(username || email )) {

        throw  new ApiError(409, "  username or email  is required ")

    }

    const user =  await User.findOne({

        $or : [{username},{email}]

    })

    if(!user) {

        throw  new ApiError(409," user doesn't exists ")

    }

    const isPasswordValid = await user.isPasswordCorrect(password) 

    if(!isPasswordValid) {

        throw  new ApiError(409, " invalid user credentials ")

    }

    const { accessToken, refreshToken } =  await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {

        httpOnly : true,
        secure : true

    }

    return  res.status(200).cookie("accessToken", accessToken , options ).cookie("refreshToken", refreshToken , options ).json( new  ApiResponse(200, {

        user : loggedInUser, refreshToken, accessToken

    }, " user loggedin successFully " ) )

 

} )

const logoutUser = asyncHandler( async(req,res) => {

    await User.findByIdAndUpdate(

        req.user?._id, {

            $unset : {

                refreshToken : 1

            }

        },

        {

            new : true

        }

    )

    const options = {

        httpOnly : true,
        secure : true

    }


    return  res.status(200).clearCookie("accessToken" , options ).clearCookie("refreshToken", options).json( new ApiResponse(200, {}, " user logout successfully " ) )

} )

const refreshAccessToken = asyncHandler(async(req,res) => {


    try {

        const incomingRefreshToken =  req.cookies?.refreshToken || req.body?.refreshToken 

        if(!incomingRefreshToken) {

            throw  new  ApiError(401, " unauthorized request ")

        }

        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)

        if(!user) {

            throw  new ApiError(401 ," invalid refresh Token ")

        }

        if(incomingRefreshToken !== user?.refreshToken ) {

            throw  new ApiError(401, " refresh token expired or already use ")

        }

        const options = {

            httpOnly : true,
            secure : true

        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user?._id)

        return  res.status(200).cookie("accessToken",  accessToken, options).cookie("refreshToken", newRefreshToken, options ).json( new ApiResponse(200, {

            accessToken, refreshToken : newRefreshToken

        }, " refresh access token successfully " ) )

  
    } 
    
    
    catch (error) {

        throw  new  ApiError(401 , error.message || " invalid refresh token " )
        
    }


} )

const changeCurrentPassword = asyncHandler(async (req,res) => {

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {

        throw  new ApiError(401, " invalid old password ")

    }

    user.password = newPassword
    await  user.save({ validateBeforeSave : false })

    return res.status(200).json( new ApiResponse(200, {}, " change password successfully " ) )

})

const getCurrentUser = asyncHandler(async(req,res) => {

    return  res.status(200).json( new ApiResponse(200,req.user, " current user fetched successfully ") )

} )

const updateAccountDetails = asyncHandler( async(req,res) => {

    const { fullName,email } = req.body

    if(!(fullName && email)) {

        throw new ApiError(401, " fullName and email are required ")

    }

    const user = await User.findByIdAndUpdate(

        req.user?._id, {

            $set : {

                fullName : fullName,
                email : email

            }

        },

        {

            new : true

        }

    ).select("-password")

    return res.status(200).json( new ApiResponse(200, user, " update account details successFully ") )

} )


const updateUserAvatar = asyncHandler( async(req,res) => {

   const avatarLocalPath = req.file?.path ;

   if(!avatarLocalPath) {

        throw  new ApiError(401, " avatar file is required ")

   }

   const user = await User.findById(req.user?._id) ;

   if(!user) {

        throw new ApiError(401, " user not found ")

   }

   if(user.avatar) {

        await deleteImageFromCloudinary(user.avatar)

   }

   const avatar = await uploadOnCloudinary(avatarLocalPath) ;

   if(!avatar?.url) {

       throw new ApiError(401, " error while uploading on avatar " ) 

   }

   const updateUser = await User.findByIdAndUpdate(

        req.user?._id, {

            $set : {

                avatar : avatar?.url

            }

        },

        {

            new : true

        }

   ).select("-password")

   return res.status(200).json( new ApiResponse(200, updateUser, " update avatar image successfully " ) )

} )

const updateUserCoverImage = asyncHandler( async(req,res) => {

    const coverImageLocalPath = req.file?.path ;
    

    if(!coverImageLocalPath) {

        throw new ApiError(401, " coverImage is required ")
    }

    const user = await User.findById(req.user?._id) ;

    if(!user) {

        throw new ApiError(401, " user not found ")

    }

    if(user.coverImage) {

        await deleteImageFromCloudinary(user.coverImage)

    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url) {

        throw new ApiError(401, " error while uploading on coverImage ")

    }

    const updateUser = await User.findByIdAndUpdate(

        req.user?._id , {

            $set : {

                coverImage : coverImage.url

            }

        },

        {

            new : true

        }

    ).select("-password")

    return res.status(200).json( new ApiResponse(200, updateUser ,"update coverImage successfully") )


} )








export  { registerUser, loginUser, generateAccessAndRefreshToken, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser , updateAccountDetails,updateUserAvatar, updateUserCoverImage }

/// let files = { coverImage: ['image1.jpg', 'image2.jpg'] };
//  console.log(files?.coverImage[0]); // Output: 'image1.jpg'
