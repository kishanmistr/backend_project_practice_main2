import { v2 as cloudinary } from "cloudinary";
import  fs from 'fs'

cloudinary.config({

    cloud_name,
    api_key,
    api_secret

})

const uploadOnCloudinary = async(fileLocalPath) => {

    try {

        if(!fileLocalPath) return  null
        const resource = await  cloudinary.uploader.upload(fileLocalPath, {

            resource_type : "auto"

        } )

        fs.unlinkSync(fileLocalPath)
        return resource
        
    }
    
    catch (error) {
        
        fs.unlinkSync(fileLocalPath)
        return  null

    }

}

export  { uploadOnCloudinary }


// (async function() {

//     // Configuration
//     cloudinary.config({ 
//         cloud_name: "kismi", 
//         api_key: "624923347687793", 
//         api_secret: "<your_api_secret>" // Click 'View Credentials' below to copy your API secret
//     });
    
//     // Upload an image
//     const uploadResult = await cloudinary.uploader.upload("https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg", {
//         public_id: "shoes"
//     }).catch((error)=>{console.log(error)});
    
//     console.log(uploadResult);
    
//     // Optimize delivery by resizing and applying auto-format and auto-quality
//     const optimizeUrl = cloudinary.url("shoes", {
//         fetch_format: 'auto',
//         quality: 'auto'
//     });
    
//     console.log(optimizeUrl);
    
//     // Transform the image: auto-crop to square aspect_ratio
//     const autoCropUrl = cloudinary.url("shoes", {
//         crop: 'auto',
//         gravity: 'auto',
//         width: 500,
//         height: 500,
//     });
    
//     console.log(autoCropUrl);    
// })();