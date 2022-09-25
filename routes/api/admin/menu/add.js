const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

//Load admin authentication middleware
const auth = require('../../../../middleware/admin/auth');
// Load Menu model 
const Menu = require('../../../../models/admin/Menu');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route POST api/role
// @description Add New Menu
// @access Private - this api can be accessed by the admin who have role permission
router.post('/', [auth, 
    [
        check('name', 'Menu is name required').not().isEmpty()
    ]
], async (req, res) => {
    try {
        const error = validationResult(req)

        if (!error.isEmpty()) {
            return res.status(400).json({
                errors: error.array()
            })
        }

        //Check the admin menu permission from the lib/helpers
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'admin menu')

        //If admin menu is not permited
        if (!adminRoles) {
            return res.status(400).send({
                errors: [
                    {
                        msg: 'Account is not authorized to modify admin menu',
                        type: 'error'
                    }
                ]
            })
        }

        
        const { name, icon } = req.body

        let menuNameCheck = await Menu.findOne({
            name
        })
    
        if (menuNameCheck) {
            return res.status(400).send({
              errors: [
                {
                  msg: 'Menu name already exists'
                }
              ]
            })
        }

        const addMenuInfo = new Menu({
            name: name.toLowerCase(),
            slug: slugify(name.toLowerCase()),
            icon
        })

        await addMenuInfo.save()

        res.status(200).json({
            type: 'success',
            msg: 'New menu added successfully',
            data: addMenuInfo
        })
    } catch (err) {
        console.error(err);
        res.status(500).send({
            msg: 'Server error',
            type: 'error'
        });
    }
});

module.exports = router