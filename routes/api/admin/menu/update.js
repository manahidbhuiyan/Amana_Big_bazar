const express = require('express');
const router = express.Router();
const slugify = require('slugify');

const {
    check,
    validationResult
} = require('express-validator');

const auth = require('../../../../middleware/admin/auth');
const Menu = require('../../../../models/admin/Menu');

const { getAdminRoleChecking } = require('../../../../lib/helpers');
// @route PUT api/role
// @description Update Menu
// @access Private
router.put('/', [auth, 
    [
        check('menuID', 'Menu name required').not().isEmpty(),
        check('name', 'Menu name required').not().isEmpty(),
        check('active', 'Menu activity required').not().isEmpty()
    ]
], async (req, res) => {
    const error = validationResult(req)

    if (!error.isEmpty()) {
        return res.status(400).json({
            errors: error.array()
        })
    }

    const { name, icon, menuID, active } = req.body

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

    let menuNameCheck = await Menu.findOne({
        name: name.toLowerCase()
    })

    try {
        
        let menu = await Menu.findById(req.body.menuID)

        if(menu.name != name.toLowerCase()){
            if (menuNameCheck) {
                return res.status(400).send({
                  errors: [
                    {
                      msg: 'Menu name already exists'
                    }
                  ]
                })
            }
        }
        menu.name = name.toLowerCase()
        menu.slug = slugify(name.toLowerCase())
        menu.icon = icon
        menu.active = active
        menu.update = Date.now()

        await menu.save()
        res.status(200).json({
            type: 'success',
            msg: 'Menu information updated successfully',
            data: menu
        });
    } catch (err) {
        if (err.kind === 'ObjectId') {
            return res.status(400).json({
                msg: 'Menu not found',
                type: 'error'
            });
        }
        console.error(err);
        res.status(500).send({
            msg: 'Server error',
            type: 'error'
          });
    }
});

module.exports = router