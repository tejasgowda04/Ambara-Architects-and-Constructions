/**
 * =========================================================================
 * Ambara Cloudinary Image Manager (js/cloudinary.js)
 * Reads cloud credentials directly from js/config.js with fallback
 * =========================================================================
 */

(function (window) {
  'use strict';

  var AmbaraCloudinary = {
    /**
     * Get Cloudinary configuration from js/config.js
     */
    getConfig: function () {
      var cloudName = '';
      var uploadPreset = '';

      if (window.AMBARA_CONFIG) {
        cloudName = window.AMBARA_CONFIG.CLOUDINARY_CLOUD_NAME || '';
        uploadPreset = window.AMBARA_CONFIG.CLOUDINARY_UPLOAD_PRESET || '';
      }

      // Optional fallback to localStorage
      if (!cloudName || !uploadPreset) {
        try {
          var stored = JSON.parse(localStorage.getItem('ambara_cloudinary_cfg') || '{}');
          cloudName = cloudName || stored.cloudName || '';
          uploadPreset = uploadPreset || stored.uploadPreset || '';
        } catch (e) {}
      }

      return {
        cloudName: cloudName.trim(),
        uploadPreset: uploadPreset.trim()
      };
    },

    /**
     * Check if Cloudinary is configured
     */
    isConfigured: function () {
      var cfg = this.getConfig();
      return Boolean(cfg.cloudName && cfg.uploadPreset);
    },

    /**
     * Upload an image file
     * If Cloudinary is configured in js/config.js, uploads to Cloudinary CDN.
     * If not configured, gracefully falls back to canvas compression data URL.
     */
    upload: async function (file, onProgress) {
      var cfg = this.getConfig();

      // If Cloudinary is set up, upload to cloud!
      if (cfg.cloudName && cfg.uploadPreset) {
        try {
          return await this.uploadToCloudinary(file, cfg.cloudName, cfg.uploadPreset, onProgress);
        } catch (err) {
          console.warn('Cloudinary upload failed, falling back to local compression:', err);
          var fallbackDataUrl = await this.compressLocal(file);
          return {
            url: fallbackDataUrl,
            source: 'local_compressed',
            warning: 'Cloudinary upload failed: ' + err.message + '. Saved locally.'
          };
        }
      }

      // Fallback: Local canvas compression
      var compressed = await this.compressLocal(file);
      return {
        url: compressed,
        source: 'local_compressed'
      };
    },

    /**
     * Direct upload to Cloudinary using Unsigned Upload Preset
     */
    uploadToCloudinary: function (file, cloudName, uploadPreset, onProgress) {
      return new Promise(function (resolve, reject) {
        var url = 'https://api.cloudinary.com/v1_1/' + cloudName + '/image/upload';
        var formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'ambara_projects');

        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);

        if (onProgress && xhr.upload) {
          xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
              var percent = Math.round((e.loaded / e.total) * 100);
              onProgress(percent);
            }
          };
        }

        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              var res = JSON.parse(xhr.responseText);
              var secureUrl = res.secure_url || res.url;
              var optimizedUrl = secureUrl.replace('/upload/', '/upload/f_auto,q_auto,w_1600/');
              resolve({
                url: optimizedUrl,
                publicId: res.public_id,
                source: 'cloudinary',
                bytes: res.bytes,
                format: res.format
              });
            } catch (err) {
              reject(new Error('Invalid Cloudinary response: ' + err.message));
            }
          } else {
            var errMsg = 'Cloudinary upload failed (' + xhr.status + ')';
            try {
              var errObj = JSON.parse(xhr.responseText);
              if (errObj.error && errObj.error.message) errMsg += ': ' + errObj.error.message;
            } catch (e) {}
            reject(new Error(errMsg));
          }
        };

        xhr.onerror = function () {
          reject(new Error('Network error during Cloudinary upload'));
        };

        xhr.send(formData);
      });
    },

    /**
     * Local browser compression fallback (max 1200px width/height, 74% JPEG quality)
     */
    compressLocal: function (file) {
      return new Promise(function (resolve) {
        var img = new Image();
        var objectUrl = URL.createObjectURL(file);
        
        img.onload = function () {
          var maxDim = 1200;
          var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(objectUrl);
          
          resolve(canvas.toDataURL('image/jpeg', 0.74));
        };

        img.onerror = function () {
          URL.revokeObjectURL(objectUrl);
          resolve('');
        };

        img.src = objectUrl;
      });
    }
  };

  window.AmbaraCloudinary = AmbaraCloudinary;
})(window);
