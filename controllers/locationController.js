import Location from '../models/locationModel.js'; 



const addLocation = async (req, res) => {
  try {
    const { location } = req.body;
    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location is required'
      });
    }
    
    const existingLocation = await Location.findOne({
      location: { $regex: `^${location.trim()}$`, $options: 'i' }
    });

    if (existingLocation) {
      return res.status(400).json({
        success: false,
        message: 'Location already exists and cannot be added twice'
      });
    }

    const newLocation = new Location({ location: location.trim() });
    await newLocation.save();

    return res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: newLocation
    });
  } catch (err) {
    console.error('createLocation error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

const getAllLocations = async (req, res, next) => {
    try {
        const locations = await Location.find().sort({ createdAt: -1 }).lean();
        return res.status(200).json({
            success: true,
            message: 'Locations fetched successfully',
            data: locations
        });
    } catch (err) {
        console.error('getAllLocations error:', err);
        return next({
            status: 500,
            message: 'Internal Server Error'
        });
    }
}

const deleteLocation = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next({
                status: 400,
                message: 'Location ID is required'
            });
        }
        const deletedLocation = await Location.findByIdAndDelete(id);
        if (!deletedLocation) {
            return next({
                status: 404,
                message: 'Location not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Location deleted successfully',
            data: deletedLocation
        });
    } catch (err) {
        console.error('deleteLocation error:', err);
        return next({
            status: 500,
            message: 'Internal Server Error'
        });
    }
}

const updateLocation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { location } = req.body;
        if (!id || !location) {
            return next({
                status: 400,
                message: 'Location ID and new location are required'
            });
        }
        const updatedLocation = await Location.findByIdAndUpdate(id, { location }, { new: true });
        if (!updatedLocation) {
            return next({
                status: 404,
                message: 'Location not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Location updated successfully',
            data: updatedLocation
        });
    } catch (err) {
        console.error('updateLocation error:', err);
        return next({
            status: 500,
            message: 'Internal Server Error'
        });
    }
}

const getLocationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next({
                status: 400,
                message: 'Location ID is required'
            });
        }
        const location = await Location.findById(id).lean();
        if (!location) {
            return next({
                status: 404,
                message: 'Location not found'
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Location fetched successfully',
            data: location
        });
    } catch (err) {
        console.error('getLocationById error:', err);
        return next({
            status: 500,
            message: 'Internal Server Error'
        });
    }
}

const changeStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            return next({
                status: 400,
                message: 'Location ID is required'
            });
        }
        const location = await Location.findById(id);
        if (!location) {
            return next({
                status: 404,
                message: 'Location not found'
            });
        }
        location.status = location.status === 'Active' ? 'Blocked' : 'Active';
        await location.save();
        return res.status(200).json({
            success: true,
            message: `Location status changed to ${location.status}`,
            data: location
        });
    } catch (err) {
        console.error('changeStatus error:', err);
        return next({
            status: 500,
            message: 'Internal Server Error'
        });
    }
}

export default {
    addLocation,
    getAllLocations,
    deleteLocation,
    updateLocation,
    getLocationById,
    changeStatus,
};