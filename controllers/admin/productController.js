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
        });

        if (!productExists) {
            const images = [];

            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;
                    const resizedImagePath = path.join('public', 'uploads', "product-images", req.files[i].filename);
                    await sharp(originalImagePath).resize({ width: 450, height: 450 }).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }

            const categoryId = await Category.findOne({ name: products.category });

            if (!categoryId) {
                return res.status(400).json("Invalid category name");
            }

            const sizes = [
                { size: 6, quantity: products.size6Quantity || 0 },
                { size: 7, quantity: products.size7Quantity || 0 },
                { size: 8, quantity: products.size8Quantity || 0 },
                { size: 9, quantity: products.size9Quantity || 0 }
            ];

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                brand: products.brand,
                category: categoryId._id,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                createdAt: new Date(),
                sizes: sizes, 
                color: products.color,
                productImage: images,
                status: "Available"
            });

            await newProduct.save();
            return res.redirect('/admin/addProducts');
        } else {
            return res.status(400).json("Product already exists. Please try with another name.");
        }
    } catch (error) {
        console.error("Error saving product", error);
        return res.redirect("/admin/pageError");
    }
};


const getProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 5;
        
        const productData = await Product.find({
            $and: [
                { isDeleted: false },
                {
                    $or: [
                        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
                    ],
                },
            ],
        })
        .limit(limit * 1)
        .skip((page - 1) * limit)
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

        // console.log(productData)
        
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
        findProduct.salePrice = findProduct.regularPrice;

        findProduct.productOffer = 0;
        await findProduct.save();

        res.json({status: true})
    } catch (error) {
        res.redirect('/admin/pageError');
    }
}

const blockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({_id: id}, {$set: {isBlocked: true}});
        res.redirect('/admin/products');
    } catch (error) {
        res.redirect("/admin/pageError");
    }
}

const unblockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({_id: id}, {$set: {isBlocked: false}});
        res.redirect("/admin/products");
    } catch (error) {
        res.redirect('/admin/pageError');
    }
}

const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({_id: id});   
        const category = await Category.find({});
        const brand = await Brand.find({});

        res.render('edit-product', {
            product: product,
            cat: category,
            brand: brand
        })
    } catch (error) {
        res.redirect("/admin/pageError");
    }
}

const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findOne({ _id: id });
        const data = req.body;

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists. Please try another name" });
        }

        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }

        const sizeQuantities = [
            { size: 6, quantity: data.size6Quantity || 0 },
            { size: 7, quantity: data.size7Quantity || 0 },
            { size: 8, quantity: data.size8Quantity || 0 },
            { size: 9, quantity: data.size9Quantity || 0 }
        ];

        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            category: product.category,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            color: data.color,
            sizes: sizeQuantities,
        };

        if (req.files.length > 0) {
            updateFields.$push = {
                productImage: {
                    $each: images
                }
            };
        }

        await Product.findByIdAndUpdate(id, updateFields, { new: true });

        res.redirect('/admin/products');
    } catch (error) {
        console.log(error);
        res.redirect('/admin/pageError');
    }
};


const deleteSingleImage = async (req, res) => {
    try {
        const {imageNameToServer, productIdToServer} = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer, {$pull: {productImage: imageNameToServer}});
        const imagePath = path.join('public','uploads', 'product-images', imageNameToServer);

        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`)
        } else {
            console.log('Image not found');
        }

        res.send({status: true});
    } catch (error) {
        res.redirect('/admin/pageError');
    }
}

const deleteProduct = async (req, res) => {
    try {
        console.log('----------deleteProduct------------')
        let id = req.query.id;
        await Product.updateOne({_id: id}, {$set: {isDeleted: true}});
        res.redirect('/admin/products');
    } catch (error) {
        res.redirect("/admin/pageError");
    }
}








module.exports = {
    getProductAdd,
    addProducts,
    getProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage,
    deleteProduct,
}