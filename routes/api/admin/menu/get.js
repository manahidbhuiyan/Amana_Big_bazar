const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const Menu = require('../../../../models/admin/Menu');

const { getAdminRoleChecking } = require('../../../../lib/helpers');

// @route GET api/menu
// @description Get all roles
// @access Public
router.get('/:pageNo', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'admin menu')

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

        let dataList = 25
        let offset = (parseInt(req.params.pageNo) - 1) * dataList

        let condition = {}

        if (req.query.type !== undefined) {
            let columnName = req.query.type
            let text = req.query.text

            condition = {
                [columnName]: {
                    $regex: text,
                    $options: "i"
                }
            }

        }

        let menus = await Menu.find(condition).limit(dataList).skip(offset)

        res.status(200).json({
            data: menus
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({
            msg: 'Server error',
            type: 'error'
        });
    }
});


// @route GET api/role/:roleID
// @description Get Single roles
// @access Public
router.get('/single/:menuID', auth, async (req, res) => {
    try {
        const adminRoles = await getAdminRoleChecking(req.admin.id, 'admin menu')

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

        let menus = await Menu.findById(req.params.menuID)

        res.status(200).json({
            data: menus,
            type: 'success'
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

router.get('/', async (req, res) => {
    try {
        let menu = await Menu.find({
           active: true 
        }).select('_id name')

        res.status(200).json({
            data: menu
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router