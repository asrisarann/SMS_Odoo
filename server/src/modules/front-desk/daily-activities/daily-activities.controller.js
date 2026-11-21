import * as dailyActivitiesService from "./daily-activities.service.js";

/**
 * Controller for Getting Daily Activities
 * Endpoint: GET /daily-activities
 */
export const getDailyActivities = async (req, res) => {
  try {
    const { date } = req.query || {};
    const dailyActivities = await dailyActivitiesService.getDailyActivities(date);

    return res.status(200).json({
      success: true,
      message: "Daily activities retrieved successfully",
      data: dailyActivities,
    });
  } catch (error) {
    console.error("Error in getDailyActivities controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving daily activities.",
      error: error.message,
    });
  }
};
