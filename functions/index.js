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

    // Ingredients
    const firebaseIngredientPromises = firebaseRecipe.ingredients.map(ingredient =>
        ingredient.food.get().then(document => document.data())
    )

    const firebaseIngredients = await Promise.all(firebaseIngredientPromises)

    const ingredients = firebaseIngredients.map(firebaseIngredient => {
        return {
            id: firebaseIngredient.id,
            name: {
                singular: firebaseIngredient.singular,
                plural: firebaseIngredient.plural
            },
            conversions: firebaseIngredient.conversions.map(conversion => {
                return {
                    ratio: conversion.ratio
                }
            })
        }
    })

    const result = {
        id: firebaseRecipe.id,
        title: firebaseRecipe.title,
        serves: firebaseRecipe.serves,
        prepTime: firebaseRecipe.prepTime,
        cookTime: firebaseRecipe.cookTime,
        ingredients,
        fb_ingredients: firebaseIngredients
    }

    response.status(200).json({
        result
    })
})