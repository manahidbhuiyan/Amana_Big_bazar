const mongoose = require('mongoose')
const Schema = mongoose.Schema

const AdminRoleSchema = new Schema({
    name:{
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    slug:{
        type: String,
        default: null,
        trim: true,
        unique: true
    },
    menu_permission: [
        {
            menu: {
                type: Schema.Types.ObjectId,
                ref: 'menu'
            },
            permission: [{
                type: Schema.Types.ObjectId,
                ref: 'permission'
            }]
        } 
    ],
    create:{
        type: Date,
        default: Date.now
    },
    update:{
        type: Date,
        default: null
    }
})

module.exports = AdminRole = mongoose.model('admin_role', AdminRoleSchema)