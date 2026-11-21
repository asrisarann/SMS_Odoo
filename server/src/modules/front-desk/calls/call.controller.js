import * as callService from "./call.service.js";

/**
 * Controller for Creating a Call Log
 * Endpoint: POST /call-logs or POST /calls
 */
export const createCallLog = async (req, res) => {
  try {
    const { callerName, phone, callType, purpose, notes } = req.body;

    const callLog = await callService.createCallLog({
      callerName,
      phone,
      callType,
      purpose,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Call log created successfully",
      data: callLog,
    });
  } catch (error) {
    console.error("Error in createCallLog controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while creating call log.",
      error: error.message,
    });
  }
};

/**
 * Controller for Getting All Call Logs
 * Endpoint: GET /call-logs or GET /calls
 */
export const getAllCallLogs = async (req, res) => {
  try {
    const { search, callType, date, page, limit } = req.validatedQuery || req.query;

    const { callLogs, pagination } = await callService.getAllCallLogs({
      search,
      callType,
      date,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    return res.status(200).json({
      success: true,
      message: "Call logs retrieved successfully",
      data: callLogs,
      pagination,
    });
  } catch (error) {
    console.error("Error in getAllCallLogs controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving call logs.",
      error: error.message,
    });
  }
};

/**
 * Controller for Getting Call Log by ID
 * Endpoint: GET /call-logs/:id or GET /calls/:id
 */
export const getCallLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const callLog = await callService.getCallLogById(id);

    if (!callLog) {
      return res.status(404).json({
        success: false,
        message: `Call log with ID '${id}' not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Call log retrieved successfully",
      data: callLog,
    });
  } catch (error) {
    console.error("Error in getCallLogById controller:", error);
    return res.status(500).json({
      success: false,
      message: "An unexpected server error occurred while retrieving call log.",
      error: error.message,
    });
  }
};
