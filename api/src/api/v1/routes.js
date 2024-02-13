const express = require('express');

const router = express.Router(); 

router.use('/info', require('./routes/info'));
router.use('/users', require('./routes/users'));
router.use('/admin', require('./routes/admin')); 
// router.use('/organizations', require('./routes/organizations'));
// router.use('/lessons', require('./routes/lessons'));
// router.use('/comments', require('./routes/comments'));
// router.use('/reflections', require('./routes/reflections'));
// router.use('/files', require('./routes/files'));

// if(process.env.ENV === 'local'){
//     router.use('/', require('./routes/swagger'));
// }

module.exports = router;

