const multer = require("multer");
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../public/uploads/images"))
    },
    filename:(req, file, cb) => {
        const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.]/g, '-');
        cb(null, Date.now() + "-" + sanitizedFilename);
    }
});


module.exports = storage;