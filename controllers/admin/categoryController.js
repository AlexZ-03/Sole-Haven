const Category = require("../../models/categorySchema.js");

const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)*limit;

        const categoryData = await Category.find({})
        .sort({createAt: -1})
        .skip(skip)
        .limit(limit);

        const totalCategory = Category.countDocuments();
        const totalPages = Math.ceil(totalCategory / limit);

        res.render("category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategory: totalCategory
        })
    } catch (error) {
        console.log("Error loading categoryInfo", error);
        res.redirect('/pageNotFound');
    }
}


const addCategory = async (req, res) => {
    const {name, description} = req.body;

    try {
        const existingCategory = await Category.findOne({name});
        if(existingCategory){
            return res.status(400).json({error: "Category already exists"});
        }

        const newCategory = new Category({
            name,
            description
        })

        await newCategory.save();
        return res.json({message: "Category added successfully"});
    } catch (error) {
        return res.status(500).json({error: "Internal Server Error"});
    }
}






module.exports = {
    categoryInfo,
    addCategory,
}