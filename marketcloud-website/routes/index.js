'use strict';

const express = require('express');
const router = express.Router();
const fs = require('fs');

/**
* Homepage gets redirected to login page
**/
router.get('/', function(req, res) {
    if (req.session.user.isAuthenticated === true) {  
        res.redirect('/applications')
    } else {
        res.redirect('/account/login')
    }
    
})


router.get('/countries/:country',function(req,res,next){
    console.log("La country richiesta è "+req.params.country)
    if (!req.params.country.replace )
    return res.status(404).send({status:false, error:"Cannot find country named "+req.params.country})
    var countryName = req.params.country.replace(new RegExp(" ","g"),"-")
    fs.readFile('./public/modules/shared/geography/countries/'+countryName+'.json',(err,data) => {
        if (err)
            return next(err);

        res.send(data);
    })
})



module.exports = router;