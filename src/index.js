import dotenv from 'dotenv'
import { connectDB } from './db/index.js'
import { app } from './app.js'

dotenv.config({

    path : "./.env"

})

connectDB()
.then(() => {

    app.get('/' , (req,res) => {

        res.send('<h1>kishan mistry</h1>')

    } )

    app.listen(process.env.PORT || 3000, () => {

        console.log(`server at http://localhost:${process.env.PORT}`);

    } )

})
.catch((err) => {

    console.log('mongodb connection failed', err);

})