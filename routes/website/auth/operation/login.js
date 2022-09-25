var express = require('express');
var router = express.Router();
var config = require('config')

/* GET login page. */
router.get('/login', function(req, res, next) {
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

  res.render('pages/auth/login', {
    scripts: scripts,
    styles: styles,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

module.exports = router;