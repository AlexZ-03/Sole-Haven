const Brands = require("../../models/brandSchema")
const Product = require("../../models/productSchema");

const getBrand = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)*limit;
        const brandData = await Brands.find({}).sort({createdAt: -1}).skip(skip).limit(limit);
        const totalBrands = await Brands.countDocuments();
        const totalPages = Math.ceil(totalBrands/limit);
        const reverseBrand = brandData.reverse();
        
        res.render("brands", {
            data: reverseBrand,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands
        })
    } catch (error) {
        res.redirect("/pageError");
    }
}

const addBrand = async (req, res) => {
    try {
        const brand = req.body.name;
        const findBrand = await Brands.findOne({brand})
        if(!findBrand){
            const image = req.file.filename;
            const newBrand = new Brands({
                brandName : brand,
                brandImage: image,
            });

            await newBrand.save();
            res.redirect('/admin/brands');
        }
    } catch (error) {
        res.redirect("/admin/pageError");
        console.log("Error as occured addBrand", error);
    }
}

const blockBrand = async (req, res) => {
    try {
        const id = req.query.id;
        await Brands.updateOne({_id: id}, {$set: {isBlocked: true}});
        res.redirect('/admin/brands');
    } catch (error) {
        console.log("Error blockBrand", error);
        res.redirect('/admin/pageError');
    }
}

const unblockBrand  = async (req, res) => {
    try {
        const id = req.query.id;

        await Brands.updateOne({_id: id}, {$set: {isBlocked: false}});
        res.redirect("/admin/brands");
    } catch (error) {
        console.log("Error unblockBrand", error);
        res.redirect("/admin/pageError");
    }
}

const deleteBrand = async (req, res) => {
    try {
        const {id} = req.query;
        if(!id){
            return res.status(400).redirect('/admin/pageError')
        }

        await Brands.deleteOne({_id: id});
        res.redirect('/admin/brands');
    } catch (error) {
        console.log("Error deleteBrands");
        res.status(500).redirect("/admin/pageError");
    }
}

module.exports = {
    getBrand,
    addBrand,
    blockBrand,
    unblockBrand,
    deleteBrand,
}