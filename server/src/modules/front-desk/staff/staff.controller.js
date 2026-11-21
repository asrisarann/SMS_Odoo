import * as staffService from "./staff.service.js";

/**
 * Controller for Getting all Staff members
 * Endpoint: GET /staff
 */
export const getAllStaff = async (req, res) => {
  try {
    const staff = await staffService.getAllStaff();
    return res.status(200).json({
      success: true,
      message: "Staff retrieved successfully",
      data: staff,
    });
  } catch (error) {
    console.error("Error in getAllStaff controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving staff.",
      error: error.message,
    });
  }
};

/**
 * Controller for Getting a Staff member by ID
 * Endpoint: GET /staff/:id
 */
export const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    const staffMember = await staffService.getStaffById(id);

    if (!staffMember) {
      return res.status(404).json({
        success: false,
        message: `Staff member with ID '${id}' not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Staff member retrieved successfully",
      data: staffMember,
    });
  } catch (error) {
    console.error("Error in getStaffById controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving staff member.",
      error: error.message,
    });
  }
};
