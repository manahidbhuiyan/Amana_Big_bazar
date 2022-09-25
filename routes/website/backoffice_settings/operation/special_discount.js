var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET Backoffice Special Discount */
router.get('/special-discount/list', urlAuth('backoffice special discount'), function(req, res, next) {
  const scripts = [
    '/assets/bundles/libscripts.bundle.js',
    '/assets/bundles/vendorscripts.bundle.js',
    '/assets/bundles/c3.bundle.js',
    '/assets/bundles/jvectormap.bundle.js',
    '/assets/bundles/knob.bundle.js',
    '/assets/bundles/mainscripts.bundle.js',
    '/assets/js/pages/index.js',
  ]
  const styles = [
    '/assets/plugins/bootstrap/css/bootstrap.min.css',
    '/assets/plugins/charts-c3/plugin.css',
    '/assets/plugins/jvectormap/jquery-jvectormap-2.0.3.min.css',
    '/assets/css/main.css',
    '/assets/css/color_skins.css',
  ]

  const breadcumb = {
    main: {
      text: 'backoffice settings',
      link: config.get('hostname') + '/dashboard/back-office/lookup/list'
    },
    sub: [{
      text: 'special discount',
      link: config.get('hostname') + '/dashboard/back-office/special-discount/list'
    }]
  }

  const data = {
    siteTitle: config.get('company').name + " - Special Discount List",
    pageTitle: "Special Discount List",
    adminInfo: req.adminInfo,
  }

  res.render('pages/back_office_settings/special_discount/list', {
    scripts: scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

router.get('/', function(req, res, next) {
  res.redirect('/dashboard/back-office/special-discount/list')
});

module.exports = router;