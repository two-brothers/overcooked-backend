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

    const firebaseRecipe = await admin
        .firestore()
        .doc(`fl_content/${id}`)
        .get()
        .then(document => document.data())

    // const food = await recipe['ingredients'][0]['food'].get().then(document => document.data())

    const ingredientsPromises = firebaseRecipe.ingredients.map(ingredient =>
        ingredient.food.get().then(document => document.data())
    )

    const ingredients = await Promise.all(ingredientsPromises)

    /* const ingredients = firebaseRecipe.ingredients.map(ingredient => {
        return {
            amount: ingredient.amount,
            description: ingredient.description,
            ingredientType: ingredient.ingredientType
        }
    })*/

    const result = {
        id: firebaseRecipe.id,
        title: firebaseRecipe.title,
        serves: firebaseRecipe.serves,
        prepTime: firebaseRecipe.prepTime,
        cookTime: firebaseRecipe.cookTime,
        // ingredients
    }

    response.status(200).json({
        firebaseRecipe,
        result,
        ingredients
    })
})