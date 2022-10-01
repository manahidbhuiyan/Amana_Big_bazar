// const express = require('express')
// const router = express.Router()
// const { fork } = require('child_process')
// const {
//     check, validationResult
// } = require('express-validator')
//
// const excel = require('node-excel-export')
// const config = require('config')
// const jwt = require('jsonwebtoken')
//
// const pdf = require('pdf-creator-node')
// const path = require('path')
// const fs = require('fs')
//
// const auth = require('../../../../../middleware/admin/auth')
//
// const {
//     getAdminRoleChecking
// } = require('../../../../../lib/helpers')
//
// // @route GET api/report/single/category/analysis?branch=..........
// // @description Get category wise analysis report pdf
// // @access Private
// router.post('/single/category/analysis',[
//     auth,
//     [
//         check('from','From date is required').not().isEmpty(),
//         check('to','To date is required').not().isEmpty(),
//         check('category','Category id is required').not().isEmpty(),
//     ]
//   ], async (req, res) =>{
//     try{
//         const error = validationResult(req)
//
//         if(!error.isEmpty()){
//             return res.status(400).json({
//                 errors: error.array()
//             })
//         }
//         const adminRoles = await getAdminRoleChecking(req.admin.id, 'report')
//
//         if(!adminRoles){
//             return res.status(400).send({
//                 errors:[
//                     {
//                         msg: 'Account is not authorized to report'
//                     }
//                 ]
//             })
//         }
//
//         let {from, to, category} = req.body
//
//         from = new Date(from)
//         from.setHours(0)
//         from.setMinutes(0)
//         from.setSeconds(0)
//
//         to = new Date(to)
//         to.setHours(0)
//         to.setMinutes(0)
//         to.setSeconds(0)
//
//         const child = fork(path.join(__dirname, "subprocess","category_wise_analysis.js"))
//
//         const msg = {
//             from,
//             to,
//             category,
//             type: 'pdf',
//             branch: req.query.branch
//         }
//        child.send(msg)
//
//     }
//     catch (err){
//         console.log(err)
//     }
//   })