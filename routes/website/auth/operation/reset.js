var express = require('express');
var router = express.Router();
var config = require('config')

/* GET login page. */
router.get('/reset/:tokenID', function(req, res, next) {
  const scripts = [
    '/assets/bundles/libscripts.bundle.js',
    '/assets/bundles/vendorscripts.bundle.js',
    '/assets/js/auth/common.js',
  ]
  const styles = [
    '/assets/css/main.css',
    '/assets/css/authentication.css',
    '/assets/css/color_skins.css',
  ]

  const dataInfo = {
    token : req.params.tokenID
  }

  res.render('pages/auth/common/reset', {
    scripts: scripts,
    styles: styles,
    data: dataInfo,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

module.exports = router;