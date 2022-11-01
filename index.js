const express = require('express')
const cors = require('cors')
require('dotenv').config()
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { request } = require('express');
const port = process.env.PORT || 5000
const stripe = require('stripe')(`sk_test_51LSmPNKWZke1s2bsAhdUdxEInMVorM0oTbYzmvypqIgRbVGrvdPPT36bYzxYy20nGI12GV7B7Pn5Kz1N3HLW3j3j00GVw6ol6R`) //stripe
app.use(cors())
app.use(express.json())
app.get('/', (req, res) => {
    res.send('Welcome to Blood donate!')
})
app.listen(port, () => {
    console.log(`Blood donate website running on port ${port}`)
})

const uri = `mongodb+srv://${process.env.DB_OWNER}:${process.env.DB_PASSWORD}@cluster0.lg0dbmv.mongodb.net/?retryWrites=true&w=majority`;
//mongodb+srv://bldonor:donor123@cluster0.lg0dbmv.mongodb.net/?retryWrites=true&w=majority || for connect mongoDBCompass
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const run = async () => {
    try {
        await client.connect();
        const donateCollection = client.db('blooddonateweb').collection('donate')
        const messageCollection = client.db('blooddonateweb').collection('message')
        const usersCollection = client.db('blooddonateweb').collection('users')
        const recordCollection = client.db('blooddonateweb').collection('donation-record') //stripedb
        // app.post('/users', async (req, res) => {
        //     const user = req.body
        //     const result = await userCollection.insertOne(user)
        //     return res.send(result)
        // })

        //for adding donation
        app.post('/donate', async (req, res) => {
            const donate = req.body
            const result = await donateCollection.insertOne(donate)
            return res.send(result)
        })

        //filter
        app.get('/request', async (req, res) => {
            if ((req.query.area === 'all' || !req.query.area) && (req.query.blood === 'all' || !req.query.blood)) {
                return res.send(await donateCollection.find({}).toArray())
            }
            if (req.query.area === 'all' && req.query.blood !== 'all') {
                return res.send(await donateCollection.find({ blood: req.query.blood }).toArray())
            }
            if (req.query.blood === 'all' && req.query.area !== 'all') {
                return res.send(await donateCollection.find({ area: req.query.area }).toArray())
            }
            return res.send(await donateCollection.find({ area: req.query.area, blood: req.query.blood }).toArray())
        })
        app.post('/add-message', async (req, res) => {
            return res.send(await messageCollection.insertOne(req.body))
        })
        app.post('/add-user', async (req, res) => {
            return res.send(await usersCollection.insertOne(req.body))
        })
        app.get('/admin-login', async (req, res) => {
            const realType = await usersCollection.findOne({ email: req.query.email })
            const isAdmin = realType?.admin
            const isCorrectPassword = req.query.password === realType?.password
            if (isAdmin && isCorrectPassword) {
                return res.send({ allOk: true })
            }
            else {
                return res.send({ allOk: false })
            }
        })
        app.get('/get-gender', async (req, res) => {
            const user = await usersCollection.findOne({ email: req.query.email })
            return res.send({ gender: user.gender })
        })
        //stripe 
        app.post('/createpayment', async (req, res) => {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: req.body.cost * 100,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({ clientSecret: paymentIntent.client_secret })
        })
        //stripe payment save
        app.post('/api/save-donation-info', async (req, res) => {
            res.send(await recordCollection.insertOne(req.body))
        })
        //data dashboard
        app.get('/data-info', async (req, res) => {
            const user = await usersCollection.find({}).toArray()
            const blood = await donateCollection.find({}).toArray()
            const donation = await recordCollection.find({}).toArray()
            // const totalDonation = donation.reduce(((acc , pre)=> acc + pre.cost),0)
            return res.send({user, blood, donation})
           
        })
        //delete
        app.delete('/delete-user', async(req, res)=>{
            return res.send(await usersCollection.deleteOne({email:req.query.user}))

        })
        //edit show
        app.get('/getsingleuser', async(req, res)=>{
            return res.send(await usersCollection.findOne({_id:ObjectId(req.query.userid)}))
            
        })
        //update
        app.put('/edituser', async(req, res)=>{
            const query = {_id: ObjectId(req.body.id)}
            const option = {upsert : true }
            const duplicate = {...req.body}
            delete duplicate.id
            console.log(duplicate)
            const update = {
                $set: duplicate
            }
            const result = await usersCollection.updateOne(query, update, option)
            res.send(result)
        })
    }
    //catch
    finally {
        //nothing
    }
}
//for consoling error in terminal
run().catch(console.dir)





