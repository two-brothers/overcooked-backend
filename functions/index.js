const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp();

/**
 * https://us-central1-overcooked-d7779.cloudfunctions.net/getRecipe?id={recipeId}
 * 
 * GET
 * @param id the recipe id
 */
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