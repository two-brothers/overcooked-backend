const functions = require('firebase-functions')
const admin = require('firebase-admin')


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });


admin.initializeApp();

exports.getRecipe = functions.https.onRequest(async (request, response) => {
    const id = request.query.id

    const recipe = await admin
        .firestore()
        .doc(`fl_content/${id}`)
        .get()
        .then(snapshot => snapshot.data())

    response.status(200).json({
        result: recipe
    })
})