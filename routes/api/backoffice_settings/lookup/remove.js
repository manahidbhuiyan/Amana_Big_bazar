const express = require('express');
const router = express.Router();

const auth = require('../../../../middleware/admin/auth');
const Lookup = require('../../../../models/Backoffice/Lookup');

const {
    getAdminRoleChecking
} = require('../../../../lib/helpers');

// @route DELETE api/brand
// @description Remove Specific brand
// @access Private
router.delete('/:lookupID', auth, async (req, res) => {
    try {

        const adminRoles = await getAdminRoleChecking(req.admin.id, 'backoffice settings')

        if (!adminRoles) {
            return res.status(400).send({
                errors: [{
                    msg: 'Account is not authorized for backoffice settings'
                }]
            })
        }

        

        // See if user exsist
        let removeLookupInfo = await Lookup.findById(req.params.lookupID)

        if(!removeLookupInfo){
            return res.status(400).send({
                errors: [
                  {
                    msg: 'Invalid lookup remove request'
                  }
                ]
              })
        }

        await removeLookupInfo.remove()

        res.status(200).json({
            msg: 'Lookup information removed successfully'
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router