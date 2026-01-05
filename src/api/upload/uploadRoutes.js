const express = require('express');
const router = express.Router();
const { upload, uploadImages } = require('./uploadController');

// POST /api/upload - 다중 이미지 업로드
router.post('/', (req, res, next) => {
    const uploadMiddleware = upload.array('images', 10);

    uploadMiddleware(req, res, (err) => {
        if (err) {
            // Multer 에러 처리
            if (err instanceof require('multer').MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: '파일 크기가 너무 큽니다. (최대 10MB)'
                    });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({
                        success: false,
                        message: '파일 개수가 너무 많습니다. (최대 10개)'
                    });
                }
            }

            return res.status(400).json({
                success: false,
                message: err.message || '파일 업로드 중 오류가 발생했습니다.'
            });
        }

        next();
    });
}, uploadImages);

module.exports = router;
