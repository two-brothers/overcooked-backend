const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

const CONFIG_FILE_NAME = "{FILE_NAME}"
const FLAMELINK_STORAGE_BASE_URL = "https://firebasestorage.googleapis.com/v0/b/overcooked-d7779.appspot.com/o/flamelink%2Fmedia%2F"
const CONFIG_IMAGE_PATH = `${FLAMELINK_STORAGE_BASE_URL}${CONFIG_FILE_NAME}?alt=media`


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
    const firebaseRecipes = await admin
        .firestore()
        .collection('fl_content')
        .where('_fl_meta_.schema', '==', 'recipes')
        .get()

    const heroImagePromises = firebaseRecipes.docs.reduce((acc, doc) => {
        const data = doc.data()
        if (data.heroImage.length > 0) {
            acc.push(data.heroImage[0].get().then(document => document.data()))
        }
        return acc
    }, [])

    const heroImageMap = await Promise.all(heroImagePromises).then(firebaseImages => firebaseImages.reduce((acc, fireabaseImage) => {
        acc[fireabaseImage.id] = CONFIG_IMAGE_PATH.replace(CONFIG_FILE_NAME, fireabaseImage.file)
        return acc
    }, {}))

    const recipes = firebaseRecipes.docs.map(doc => {
        const data = doc.data()
        return {
            id: data.id,
            title: data.title,
            heroImageUrl: data.heroImage.length > 0 && heroImageMap[data.heroImage[0].id] ? heroImageMap[data.heroImage[0].id] : ""
        }
    })

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

    // hero image
    const heroImage = firebaseRecipe.heroImage.length > 0 ? await firebaseRecipe.heroImage[0].get().then(doc => doc.data()) : ''

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
            heroImageUrl: CONFIG_IMAGE_PATH.replace(CONFIG_FILE_NAME, heroImage.file),
            serves: firebaseRecipe.serves,
            prepTime: firebaseRecipe.prepTime,
            cookTime: firebaseRecipe.cookTime,
            ingredients,
            method: firebaseRecipe.method.map(item => item.step),
            referenceName: firebaseRecipe.referenceName,
            referenceUrl: firebaseRecipe.referenceUrl
        },
        food: arrayToObject(food, "id")
    }

    response.status(200).json({
        data: {
            ...result
        }
    })
})