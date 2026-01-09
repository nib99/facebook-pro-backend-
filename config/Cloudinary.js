const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Local file path
 * @param {string} folder - Cloudinary folder name
 * @param {object} options - Additional upload options
 * @returns {Promise<object>} Upload result
 */
const uploadToCloudinary = async (filePath, folder = 'facebook-pro', options = {}) => {
  try {
    const defaultOptions = {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ],
      ...options
    };

    const result = await cloudinary.uploader.upload(filePath, defaultOptions);

    // Delete local file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    // Clean up local file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array} files - Array of file objects with path property
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<Array>} Array of upload results
 */
 const uploadToCloudinary = async (filePath, folder = 'facebook-pro', options = {}) => {
  try {
    const defaultOptions = {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ],
      ...options
    };

    const result = await cloudinary.uploader.upload(filePath, defaultOptions);

    // Delete local file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      size: result.bytes
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    
    // Clean up local file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array} files - Array of file objects with path property
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<Array>} Array of upload results
 */
const uploadMultipleToCloudinary = async (files, folder = 'facebook-pro') => {
  try {
    const uploadPromises = files.map(file => 
      uploadToCloudinary(file.path, folder)
    );

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw new Error(`Failed to upload multiple files: ${error.message}`);
  }
};
/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, video, raw)
 * @returns {Promise<object>} Deletion result
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    return {
      success: result.result === 'ok',
      message: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
  }
};

/**
 * Delete multiple files from Cloudinary
 * @param {Array} publicIds - Array of public IDs
 * @param {string} resourceType - Resource type
 * @returns {Promise<object>} Deletion result
 */
const deleteMultipleFromCloudinary = async (publicIds, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType
    });

    return {
      success: true,
      deleted: result.deleted,
      partial: result.partial
    };
  } catch (error) {
    console.error('Multiple delete error:', error);
    throw new Error(`Failed to delete multiple files: ${error.message}`);
  }
};

/**
 * Upload video to Cloudinary with specific options
 * @param {string} filePath - Local file path
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<object>} Upload result
 */
const uploadVideoToCloudinary = async (filePath, folder = 'facebook-pro/videos') => {
  try {
    const result = await uploadToCloudinary(filePath, folder, {
      resource_type: 'video',
      chunk_size: 6000000, // 6MB chunks
      eager: [
        { width: 1280, height: 720, crop: 'limit', format: 'mp4' },
        { width: 854, height: 480, crop: 'limit', format: 'mp4' }
      ],
      eager_async: true
    });
return result;
  } catch (error) {
    console.error('Video upload error:', error);
    throw new Error(`Failed to upload video: ${error.message}`);
  }
};

/**
 * Upload profile image with face detection
 * @param {string} filePath - Local file path
 * @returns {Promise<object>} Upload result
 */
const uploadProfileImage = async (filePath) => {
  try {
    const result = await uploadToCloudinary(filePath, 'facebook-pro/profiles', {
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    return result;
  } catch (error) {
    console.error('Profile image upload error:', error);
    throw new Error(`Failed to upload profile image: ${error.message}`);
  }
};

/**
 * Generate signed URL for private resources
 * @param {string} publicId - Cloudinary public ID
 * @param {number} expiresIn - Expiration time in seconds
 * @returns {string} Signed URL
 */
const generateSignedUrl = (publicId, expiresIn = 3600) => {
  try {
    const timestamp = Math.round(Date.now() / 1000) + expiresIn;
    
    const signedUrl = cloudinary.url(publicId, {
      sign_url: true,
      secure: true,
      type: 'authenticated',
      expires_at: timestamp
    });

    return signedUrl;
  } catch (error) {
    console.error('Signed URL generation error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
};

/**
 * Get resource details from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>} Resource details
 */
const getResourceDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error('Get resource error:', error);
    throw new Error(`Failed to get resource details: ${error.message}`);
  }
};
// Export functions
module.exports = {
  cloudinary,
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  uploadVideoToCloudinary,
  uploadProfileImage,
  generateSignedUrl,
  getResourceDetails
};
