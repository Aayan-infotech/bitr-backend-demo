import StaticContent from '../models/staticContentModel.js';


export const addStaticContent = async (req, res) => {
  try {
    const { section, content } = req.body;
    if (!section || !content) {
      return res.status(400).json({ message: 'section and content are required' });
    }

    const updatedDoc = await StaticContent.findOneAndUpdate(
      { section },
      { content, updatedAt: Date.now() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ message: 'Static content saved', data: updatedDoc });
  } catch (err) {
    console.error('Error in addOrUpdateStaticContent:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


export const getStaticContentBySection = async (req, res) => {
  try {
    const { section } = req.params;
    const item = await StaticContent.findOne({ section });
    if (!item) {
      return res.status(404).json({ message: 'Content not found for this section' });
    }
    return res.status(200).json({ data: item });
  } catch (err) {
    console.error('Error in getStaticContentBySection:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export default {
  addStaticContent,
  getStaticContentBySection
};
