const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");


const getProductAdd = async (req, res) => {
    try {
        const category = await Category.find({isListed: true});
        const brand = await Brand.find({isBlocked: false});
        res.render("product-add", {
            cat: category,
            brand: brand
        })
    } catch (error) {
        res.redirect("/admin/pageError");
    }
}

const addProducts = async (req, res) => {
    try {
        const products = req.body;
        const productExists = await Product.findOne({
            productName: products.productName,
        })

        if(!productExists) {
            const images = [];

            if(req.files && req.files.length > 0){
                for(let i = 0 ; i < req.files.length; i++){
                    const originalImagePath = req.files[i].path;
                    
                    const resizedImagePath = path.join('public', 'uploads', "product-images", req.files[i].filename);
                    await sharp(originalImagePath).resize({width: 450, height: 450}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }

            const categoryId = await Category.findOne({name: products.category});

            if(!categoryId){
                return res.status(400).join("Invaild category name");
            }

            const newProduct = new Product({
                productName:products.productName,
                description: products.description,
                brand: products.brand,
                category:categoryId._id,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                createdAt: new Date(),
                quantity: products.quantity,
                size: products.size,
                color: products.color,
                productImage: images,
                status: "Available"
            });

            await newProduct.save();
            return res.redirect('/admin/addProducts');
        } else {
            return res.status(400).json("Products Already exists, Please try with another name");
        }
    } catch (error) {
        console.error("Error saving product", error);
        return res.redirect("/admin/pageError");
    }
}

const getProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;
        
        const productData = await Product.find({
            $or: [
                {productName: {$regex: new RegExp(".*"+search+".*","i")}},
                {brand: {$regex: new RegExp(".*"+search+".*","i")}},
            ],
        }).limit(limit*1)
        .skip((page-1)*limit)
        .populate('category')
        .exec();

        const count = await Product.find({
            $or: [
                {productName: {$regex: new RegExp(".*"+search+".*","i")}},
                {brand: {$regex: new RegExp(".*"+search+".*","i")}},
            ],
        }).countDocuments();

        const category = await Category.find({isListed: true});
        const brand = await Brand.find({isBlocked: false});
        
        if(category && brand){
            res.render("products",{
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count/limit),
                cat: category,
                brand: brand,
            })
        } else {
            res.render('pageError');
        }
    } catch (error) {
        res.redirect('/admin/pageError');
        console.log("Error while getProduct", error);
    }
}

const addProductOffer = async (req, res) => {
    try {
        const {productId, percentage} = req.body;
        const findProduct = await Product.findOne({_id: productId});
        const findCategory = await Category.findOne({_id: findProduct.category});

        if(findCategory.categoryOffer > percentage) {
            return res.json({status: false, message: "This product category already has a category offer"});
        }
        findProduct.salePrice = findProduct.salePrice-Math.floor(findProduct.regularPrice*(percentage/100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();
        findCategory.categoryOffer = 0;
        await findCategory.save();

        res.json({status: true});
    } catch (error) {
        res.redirect('/admin/pageError');
        res.status(500).json({status: false, message: "Internal sever error"})
    }
}

const removeProductOffer = async (req, res) => {
    try {
        const {productId} = req.body;

        const findProduct = await Product.findOne({_id: productId});
        const percentage = findProduct.productOffer;
        findProduct.salePrice = findProduct.salePrice + Math.floor(findProduct.regularPrice * (percentage / 100));

        findProduct.productOffer = 0;
        await findProduct.save();

        res.json({status: true})
    } catch (error) {
        res.redirect('/admin/pageError');
    }
}


module.exports = {
    getProductAdd,
    addProducts,
    getProducts,
    addProductOffer,
    removeProductOffer
}