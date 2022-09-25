const express = require('express')
const router = express.Router()
// Load User Model
const User = require('../../../../models/User')


// @route GET api/auth/user/verify
// @description Verification link verify
// @access Private
router.get('/verify/:id', async (req, res)=>{
    const verify = req.params.id;
    try {
        let user = await User.findOne({
            "verify.code": verify
          })

        if(!user){
            return res.status(404).json({
                msg: 'Invalid verification link'
            });
        }
        user.verify.status = true
        await user.save()
        
    
        
        res.status(200).json({
            msg: 'Email verification is completed'
        });   
    } catch (error) {
        console.error(error.message)
        res.status(500).send('Server error')
    }
})

module.exports = router