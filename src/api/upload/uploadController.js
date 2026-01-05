const multer = require('multer');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const logger = require('../../utils/logger');

// GCS 설정
const storage = new Storage();
const bucketName = 'codelab-lbstech-storage';
const folderName = 'jun0-codelab';

// Multer 메모리 스토리지 사용 (파일을 메모리에 임시 저장)
const multerStorage = multer.memoryStorage();

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
    storage: multerStorage,
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

        const bucket = storage.bucket(bucketName);
        const uploadPromises = [];
        const fileInfos = [];

        // 각 파일을 GCS에 업로드
        for (const file of req.files) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const fileName = `${folderName}/${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
            const blob = bucket.file(fileName);

            const blobStream = blob.createWriteStream({
                resumable: false,
                metadata: {
                    contentType: file.mimetype,
                    metadata: {
                        originalName: file.originalname
                    }
                }
            });

            const uploadPromise = new Promise((resolve, reject) => {
                blobStream.on('error', (err) => {
                    logger.error({
                        message: 'GCS 업로드 실패',
                        error: err.message,
                        file: file.originalname
                    });
                    reject(err);
                });

                blobStream.on('finish', async () => {
                    // 파일을 공개로 설정
                    await blob.makePublic();

                    const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

                    fileInfos.push({
                        originalName: file.originalname,
                        filename: fileName,
                        url: publicUrl,
                        size: file.size,
                        mimetype: file.mimetype
                    });

                    resolve();
                });

                blobStream.end(file.buffer);
            });

            uploadPromises.push(uploadPromise);
        }

        // 모든 업로드가 완료될 때까지 대기
        await Promise.all(uploadPromises);

        logger.info({
            message: 'GCS 이미지 업로드 성공',
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
