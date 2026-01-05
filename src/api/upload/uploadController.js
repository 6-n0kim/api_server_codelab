const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');

// uploads 디렉토리가 없으면 생성
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`Created upload directory: ${uploadDir}`);
}

// 파일 저장 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// 파일 필터 (이미지만 허용)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('이미지 파일만 업로드 가능합니다 (jpeg, jpg, png, gif, webp)'));
    }
};

// multer 설정
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: fileFilter
});

// 이미지 업로드 핸들러
const uploadImages = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: '업로드된 파일이 없습니다.'
            });
        }

        const fileInfos = req.files.map(file => ({
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype
        }));

        logger.info({
            message: '이미지 업로드 성공',
            fileCount: req.files.length,
            files: fileInfos
        });

        res.status(200).json({
            success: true,
            message: `${req.files.length}개의 이미지가 성공적으로 업로드되었습니다.`,
            files: fileInfos
        });

    } catch (error) {
        logger.error({
            message: '이미지 업로드 실패',
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: '이미지 업로드 중 오류가 발생했습니다.',
            error: error.message
        });
    }
};

module.exports = {
    upload,
    uploadImages
};
