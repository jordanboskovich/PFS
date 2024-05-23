// controllers/resourceController.js
import Resource from '../models/Resource.js';

// Get resources
export const getResources = async (req, res) => {
  try {
    const resources = await Resource.find();
    res.render('admin_resources', { resources });
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

export const addResource = async (req, res) => {
  try {
    const { title, description, link } = req.body;
    const newResource = new Resource({ title, description, link });
    await newResource.save();
    res.redirect('/admin/resources');
  } catch (err) {
    res.status(500).send('Server Error');
  }
};

// Delete resource
export const deleteResource = async (req, res) => {
  try {
    await Resource.findByIdAndDelete(req.params.id);
    res.redirect('/admin/resources');
  } catch (err) {
    res.status(500).send('Server Error');
  }
};
