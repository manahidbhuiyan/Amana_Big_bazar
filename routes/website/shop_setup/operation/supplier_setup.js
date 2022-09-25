var express = require('express');
var router = express.Router();
var config = require('config')

/* GET login page. */
router.get('/supplier_setup', function(req, res, next) {
  const scripts = [
    '/assets/bundles/libscripts.bundle.js',
    '/assets/bundles/vendorscripts.bundle.js',
    '/assets/bundles/c3.bundle.js',
    '/assets/bundles/jvectormap.bundle.js',
    '/assets/bundles/knob.bundle.js',
    '/assets/bundles/mainscripts.bundle.js',
    '/assets/plugins/momentjs/moment.js',
    '/assets/plugins/bootstrap-material-datetimepicker/js/bootstrap-material-datetimepicker.js',
    '/assets/js/pages/index.js',
  ]
  const styles = [
    '/assets/plugins/bootstrap/css/bootstrap.min.css',
    '/assets/plugins/charts-c3/plugin.css',
    '/assets/plugins/jvectormap/jquery-jvectormap-2.0.3.min.css',
    '/assets/plugins/bootstrap-material-datetimepicker/css/bootstrap-material-datetimepicker.css',
    '/assets/css/main.css',
    '/assets/css/color_skins.css',
  ]

  const breadcumb = {
    main: {
      text: 'shop setup',
      link: config.get('hostname') + '/dashboard/manage/shop'
    },
      sub: [
          {
            text: 'supplier setup',
            link: config.get('hostname') + '/dashboard/manage/shop/supplier_setup'
        }
      ]
  }

  const data = {
    siteTitle: config.get('company').name + " - Supplier Setup",
    pageTitle: "Supplier Setup",
  }

  res.render('pages/shop_setup/supplier_setup', {
    scripts: scripts,
    styles: styles,
    breadcumb: breadcumb,
    data: data,
    companyInfo: config.get('company'),
    host: config.get('hostname')
  });
});

router.get('/', function(req, res, next) {
  res.redirect('/dashboard/manage/shop/supplier_setup')
});

module.exports = router;