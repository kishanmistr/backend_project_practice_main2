import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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

export  { registerUser }

/// let files = { coverImage: ['image1.jpg', 'image2.jpg'] };
//  console.log(files?.coverImage[0]); // Output: 'image1.jpg'
