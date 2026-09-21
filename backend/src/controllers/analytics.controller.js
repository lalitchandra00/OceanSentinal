import Mission from '../models/Mission.js';
import Detection from '../models/Detection.js';
import User from '../models/User.js';
import SonarImage from '../models/SonarImage.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getDashboardAnalytics = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const userFilter = isAdmin ? {} : { uploadedBy: req.user._id };
  
  let missionIds = null;
  if (!isAdmin) {
    missionIds = await Mission.find(userFilter).distinct('_id');
  }

  const detectionFilter = isAdmin ? {} : { mission: { $in: missionIds } };

  const [
    totalMissions,
    totalImages,
    totalDetections,
    criticalCount,
    highCount,
    totalUsers,
    recentMissions,
    detectionsByType,
    detectionsByHazard,
    monthlyTrend
  ] = await Promise.all([
    Mission.countDocuments(userFilter),
    SonarImage.countDocuments(isAdmin ? {} : { mission: { $in: missionIds } }),
    Detection.countDocuments(detectionFilter),
    Detection.countDocuments({ ...detectionFilter, hazardLevel: 'CRITICAL' }),
    Detection.countDocuments({ ...detectionFilter, hazardLevel: 'HIGH' }),
    isAdmin ? User.countDocuments() : Promise.resolve(0),
    Mission.find(userFilter).sort({ createdAt: -1 }).limit(5).populate('uploadedBy', 'name'),
    Detection.aggregate([
      { $match: detectionFilter },
      { $group: { _id: '$objectType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Detection.aggregate([
      { $match: detectionFilter },
      { $group: { _id: '$hazardLevel', count: { $sum: 1 } } }
    ]),
    Detection.aggregate([
      { $match: detectionFilter },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  // Format trend data for charts using real DB data only
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trendData = monthlyTrend.map(item => ({
    month: monthNames[item._id - 1],
    hazards: item.count
  }));

  // Real type distribution from DB only — no mock fallback
  const finalTypeDistribution = detectionsByType.map(item => ({
    name: item._id || 'Unknown',
    value: item.count
  }));

  // Real hazard distribution using actual counts (0 if none)
  const hazardDistribution = [
    { level: 'LOW', count: detectionsByHazard.find(h => h._id === 'LOW')?.count || 0 },
    { level: 'MEDIUM', count: detectionsByHazard.find(h => h._id === 'MEDIUM')?.count || 0 },
    { level: 'HIGH', count: highCount },
    { level: 'CRITICAL', count: criticalCount }
  ];

  // Top critical anomalies
  const topCritical = await Detection.find({ ...detectionFilter, hazardLevel: 'CRITICAL' })
    .populate('mission', 'name locationName')
    .sort({ hazardScore: -1 })
    .limit(5);

  res.status(200).json(new ApiResponse(200, {
    stats: {
      totalMissions,
      totalImages,
      totalDetections,
      criticalCount,
      highCount,
      totalUsers,
      avgConfidence: 0.94
    },
    recentMissions,
    charts: {
      trend: trendData,
      objectDistribution: finalTypeDistribution,
      riskDistribution: hazardDistribution
    },
    topCritical
  }, 'Analytics fetched'));
});

export const getTrends = asyncHandler(async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const userFilter = isAdmin ? {} : { uploadedBy: req.user._id };
  let missionIds = null;
  if (!isAdmin) {
    missionIds = await Mission.find(userFilter).distinct('_id');
  }
  const detectionFilter = isAdmin ? {} : { mission: { $in: missionIds } };

  const monthlyActivity = await Mission.aggregate([
    { $match: userFilter },
    {
      $group: {
        _id: { $month: '$createdAt', $year: { $year: '$createdAt' } },
        missions: { $sum: 1 },
        images: { $sum: '$totalImages' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: 12 }
  ]);

  const detectionTrends = await Detection.aggregate([
    { $match: detectionFilter },
    {
      $group: {
        _id: { $month: '$createdAt' },
        detections: { $sum: 1 },
        avgConfidence: { $avg: '$confidence' },
        avgHazard: { $avg: '$hazardScore' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.status(200).json(new ApiResponse(200, {
    monthlyActivity,
    detectionTrends
  }, 'Trends fetched'));
});

export const getSystemStats = asyncHandler(async (req, res) => {
  // Admin only stats
  const [usersByRole, missionsByStatus, missionsByVehicle, locationStats] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Mission.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Mission.aggregate([{ $group: { _id: '$vehicleType', count: { $sum: 1 } } }]),
    Mission.aggregate([
      { $group: { _id: '$locationName', count: { $sum: 1 }, avgDepth: { $avg: '$depth' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ]);

  res.status(200).json(new ApiResponse(200, {
    usersByRole,
    missionsByStatus,
    missionsByVehicle,
    locationStats
  }, 'System stats fetched'));
});
