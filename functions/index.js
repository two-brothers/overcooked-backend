const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()


const arrayToObject = (array, keyField) => {
    return array.reduce((obj, item) => {
        obj[item[keyField]] = item
        return obj
    }, {})
}



/**
 * https://us-central1-overcooked-d7779.cloudfunctions.net/getRecipeList
 * GET
 */
exports.getRecipeList = functions.https.onRequest(async (request, response) => {
    const recipes = await admin
        .firestore()
        .collection('fl_content')
        .where('_fl_meta_.schema', '==', 'recipes')
        .get()
        .then(querySnapshot => (
            querySnapshot.docs.map(doc => {
                const data = doc.data()
                return {
                    id: data.id,
                    title: data.title
                }
            })
        ))

    response.status(200).json({
        data: {
            recipes
        }
    })
})



/**
 * https://us-central1-overcooked-d7779.cloudfunctions.net/getRecipe?id={recipeId}
 * 
 * GET
 * @query id the recipe id
 */
exports.getRecipe = functions.https.onRequest(async (request, response) => {
    const id = request.query.id

    const firebaseRecipe = await admin
        .firestore()
        .doc(`fl_content/${id}`)
        .get()
        .then(document => document.data())

    // ingredients
    const ingredients = firebaseRecipe.ingredients.map(ingredient => {
        return {
            ingredientTypeId: parseInt(ingredient.ingredientType),
            amount: typeof ingredient.amount === 'string' ? null : ingredient.amount,
            measurementUnitId: ingredient.measurementUnit ? ingredient.measurementUnit.id : null,
            foodId: ingredient.food ? ingredient.food.id : null,
            description: ingredient.description
        }
    })

    // food
    const firebaseFoodPromises = firebaseRecipe.ingredients.reduce((acc, ingredient) => {
        if (ingredient.food !== '') {
            acc.push(ingredient.food.get().then(document => document.data()))
        }
        return acc
    }, [])

    const firebaseFood = await Promise.all(firebaseFoodPromises)

    const food = await Promise.all(firebaseFood.map(foodItem => {
        const conversionsPromise = Promise.all(
            foodItem.conversions.map(conversion =>
                conversion.unit.get()
                    .then(document => document.data())
                    .then(firebaseUnit => ({ unit: firebaseUnit, ratio: conversion.ratio }))))

        return conversionsPromise.then(conversions => ({
            id: foodItem.id,
            name: {
                singular: foodItem.singular,
                plural: foodItem.plural
            },
            conversions: conversions.map(conversion => ({
                ratio: conversion.ratio,
                measurementUnitId: conversion.unit.id
            }))
        }))
    }))

    const result = {
        recipe: {
            id: firebaseRecipe.id,
            title: firebaseRecipe.title,
            serves: firebaseRecipe.serves,
            prepTime: firebaseRecipe.prepTime,
            cookTime: firebaseRecipe.cookTime,
            ingredients,
            method: firebaseRecipe.method.map(item => item.step)
        },
        food: arrayToObject(food, "id")
    }

    response.status(200).json({
        data: {
            ...result
        }
    })
})