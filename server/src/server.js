const express=require('express');
const app=express();


app.use('/',router);

const PORT=3000
app.listen(PORT,()=>{
    console.log(`Server is running on ${PORT}`)
})