var express = require('express');
var router = express.Router();
var config = require('config')
var urlAuth = require('../../../../middleware/admin/url_auth')

/* GET login page. */
router.get('/branch', urlAuth('export import branch'), function (req, res, next) {
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
      text: 'export import',
      link: config.get('hostname') + '/dashboard/export-import'
    },
    sub: [{
      text: 'branch',
      link: config.get('hostname') + '/dashboard/export-import/branch'
    }]
  }

  const data = {
    siteTitle: config.get('company').name + " - Export Import",
    pageTitle: "Manage Export Import",
    adminInfo: req.adminInfo,
  }

  res.render('pages/branch/export_import', {
    scripts: scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

router.get('/', function (req, res, next) {
  res.redirect('/dashboard/export-import/branch')
});

module.exports = router;