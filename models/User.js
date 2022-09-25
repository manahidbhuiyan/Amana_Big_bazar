const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
    },
    phone: {
        number: {
            type: String,
            unique: true,
            required: true
        },
        verificationCode: {
            type: Number
        },
        status: {
            type: Boolean,
            default: false
        },
        date: {
            type: Date,
            default: Date.now
        }
    },
    email: {
        type: String,
        default: null
    },
    password: {
        type: String
    },
    avatar: {
        type: String
    },
    contact: {
        address: {
            type: String
        },
        thana: {
            type: String,
        },
        district: {
            type: String,
        },
        division: {
            type: String,
        }
    },
    verify: {
        code: {
            type: String,
            require: true
        },
        status: {
            type: Boolean,
            require: true,
            default: false
        },
        date: {
            type: Date,
            default: Date.now
        }
    },
    forgot: {
        code: {
            type: String
        },
        status: {
            type: Boolean
        },
        date: {
            type: Date
        }
    },
    create: {
        type: Date,
        default: Date.now
    },
    update: {
        type: Date,
        default: null
    }
});

module.exports = User = mongoose.model('user', UserSchema);