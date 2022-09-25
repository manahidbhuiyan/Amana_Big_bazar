const mongoose = require('mongoose')
const Schema = mongoose.Schema

const AdminRoleSchema = new Schema({
    name:{
        type: String,
        required: true
    },
    icon:{
        type: String,
        default: null
    },
    create:{
        type: Date,
        default: Date.now
    },
    update:{
        type: Date,
        default: null
    }
})

module.exports = Role = mongoose.model('role', AdminRoleSchema)