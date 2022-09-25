const mongoose = require('mongoose')
const Schema = mongoose.Schema

const AdminSchema = new Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    email: {
        type: String,
        trim: true,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String
    },
    superAdmin:{
        type: Boolean,
        default: false
    },
    admin_roles_id:  {
        type: Schema.Types.ObjectId,
        ref: 'admin_role'
    },
    admin_roles: [
        {
            type: String
        }
    ],
    roles: [
        {
            type: Schema.Types.ObjectId,
            ref: 'role',
            default: null
        }
    ],
    sdcDeviceInfo: [
        {
            branchID: {
                type: Schema.Types.ObjectId,
                ref: 'branch'
            },
            sdcIP: {
                type: String,
                default: null,
                trim: true
            }
        }
    ],
    branches: [
        {
            type: Schema.Types.ObjectId,
            ref: 'branch'
        }
    ],
    verify:{
        code: {
         type: String,
         default: null   
        },
        status: {
            type: Boolean,
            require: true,
            default: false
        },
        date:{
            type: Date,
            default: Date.now
        }
    },
    forgot:{
        code: {
         type: String  
        },
        status: {
            type: Boolean
        },
        date:{
            type: Date
        }
    },
    active: {
        type: Boolean,
        default: true
    },
    sdc_device_uttara:{
        type: String,
        default: null
    },
    create:{
        type: Date,
        default: Date.now
    },
    update:{
        type: Date,
        default: Date.now
    }
});

module.exports = Admin = mongoose.model('admin', AdminSchema);