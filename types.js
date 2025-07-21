"use strict";
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVITY_BADGE_DETAILS = exports.MODERATOR_BADGE_DETAILS = exports.ADMIN_BADGE_DETAILS = exports.USER_LEVELS = exports.UserLevelName = exports.JOB_SUBCATEGORIES_MAP = exports.JobSubCategory = exports.JOB_CATEGORY_STYLES = exports.JOB_CATEGORY_EMOJIS_MAP = exports.JobCategory = exports.WEBBOARD_CATEGORY_STYLES = exports.WebboardCategory = exports.VouchReportStatus = exports.VOUCH_TYPE_LABELS = exports.VouchType = exports.View = exports.UserRole = exports.HelperEducationLevelOption = exports.JobDesiredEducationLevelOption = exports.GenderOption = exports.Province = void 0;
var Province;
(function (Province) {
    Province["ChiangMai"] = "\u0E40\u0E0A\u0E35\u0E22\u0E07\u0E43\u0E2B\u0E21\u0E48";
    Province["Bangkok"] = "\u0E01\u0E23\u0E38\u0E07\u0E40\u0E17\u0E1E\u0E21\u0E2B\u0E32\u0E19\u0E04\u0E23";
})(Province || (exports.Province = Province = {}));
var GenderOption;
(function (GenderOption) {
    GenderOption["Male"] = "\u0E0A\u0E32\u0E22";
    GenderOption["Female"] = "\u0E2B\u0E0D\u0E34\u0E07";
    GenderOption["Other"] = "\u0E2D\u0E37\u0E48\u0E19 \u0E46 / \u0E40\u0E1E\u0E28\u0E17\u0E32\u0E07\u0E40\u0E25\u0E37\u0E2D\u0E01";
    GenderOption["NotSpecified"] = "\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38";
})(GenderOption || (exports.GenderOption = GenderOption = {}));
var JobDesiredEducationLevelOption;
(function (JobDesiredEducationLevelOption) {
    JobDesiredEducationLevelOption["Any"] = "\u0E44\u0E21\u0E48\u0E08\u0E33\u0E01\u0E31\u0E14";
    JobDesiredEducationLevelOption["MiddleSchool"] = "\u0E21.\u0E15\u0E49\u0E19";
    JobDesiredEducationLevelOption["HighSchool"] = "\u0E21.\u0E1B\u0E25\u0E32\u0E22";
    JobDesiredEducationLevelOption["Vocational"] = "\u0E1B\u0E27\u0E0A./\u0E1B\u0E27\u0E2A.";
    JobDesiredEducationLevelOption["Bachelor"] = "\u0E1B\u0E23\u0E34\u0E0D\u0E0D\u0E32\u0E15\u0E23\u0E35";
    JobDesiredEducationLevelOption["Higher"] = "\u0E2A\u0E39\u0E07\u0E01\u0E27\u0E48\u0E32\u0E1B\u0E23\u0E34\u0E0D\u0E0D\u0E32\u0E15\u0E23\u0E35";
})(JobDesiredEducationLevelOption || (exports.JobDesiredEducationLevelOption = JobDesiredEducationLevelOption = {}));
var HelperEducationLevelOption;
(function (HelperEducationLevelOption) {
    HelperEducationLevelOption["NotStated"] = "\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E30\u0E1A\u0E38";
    HelperEducationLevelOption["MiddleSchool"] = "\u0E21.\u0E15\u0E49\u0E19";
    HelperEducationLevelOption["HighSchool"] = "\u0E21.\u0E1B\u0E25\u0E32\u0E22";
    HelperEducationLevelOption["Vocational"] = "\u0E1B\u0E27\u0E0A./\u0E1B\u0E27\u0E2A.";
    HelperEducationLevelOption["Bachelor"] = "\u0E1B\u0E23\u0E34\u0E0D\u0E0D\u0E32\u0E15\u0E23\u0E35";
    HelperEducationLevelOption["Higher"] = "\u0E2A\u0E39\u0E07\u0E01\u0E27\u0E48\u0E32\u0E1B\u0E23\u0E34\u0E0D\u0E0D\u0E32\u0E15\u0E23\u0E35";
})(HelperEducationLevelOption || (exports.HelperEducationLevelOption = HelperEducationLevelOption = {}));
var UserRole;
(function (UserRole) {
    UserRole["Admin"] = "Admin";
    UserRole["Moderator"] = "Moderator";
    UserRole["Member"] = "Member";
})(UserRole || (exports.UserRole = UserRole = {}));
var View;
(function (View) {
    View["Home"] = "HOME";
    View["PostJob"] = "POST_JOB";
    View["FindJobs"] = "FIND_JOBS";
    View["OfferHelp"] = "OFFER_HELP";
    View["FindHelpers"] = "FIND_HELPERS";
    View["Login"] = "LOGIN";
    View["Register"] = "REGISTER";
    View["AdminDashboard"] = "ADMIN_DASHBOARD";
    View["MyPosts"] = "MY_POSTS";
    View["UserProfile"] = "USER_PROFILE";
    View["MyRoom"] = "MY_ROOM";
    View["AboutUs"] = "ABOUT_US";
    View["PublicProfile"] = "PUBLIC_PROFILE";
    View["Safety"] = "SAFETY";
    View["Webboard"] = "WEBBOARD";
    View["PasswordReset"] = "PASSWORD_RESET";
})(View || (exports.View = View = {}));
var VouchType;
(function (VouchType) {
    VouchType["WorkedTogether"] = "worked_together";
    VouchType["Colleague"] = "colleague";
    VouchType["Community"] = "community";
    VouchType["Personal"] = "personal";
})(VouchType || (exports.VouchType = VouchType = {}));
exports.VOUCH_TYPE_LABELS = (_a = {},
    _a[VouchType.WorkedTogether] = 'เคยร่วมงานกัน (ในฐานะผู้ว่าจ้าง/ผู้รับจ้าง)',
    _a[VouchType.Colleague] = 'เคยเป็นเพื่อนร่วมงาน',
    _a[VouchType.Community] = 'คนในชุมชน/พื้นที่เดียวกันที่น่าเชื่อถือ',
    _a[VouchType.Personal] = 'รู้จักเป็นการส่วนตัว (เพื่อน, คนรู้จัก)',
    _a);
var VouchReportStatus;
(function (VouchReportStatus) {
    VouchReportStatus["Pending"] = "pending_review";
    VouchReportStatus["ResolvedKept"] = "resolved_kept";
    VouchReportStatus["ResolvedDeleted"] = "resolved_deleted";
})(VouchReportStatus || (exports.VouchReportStatus = VouchReportStatus = {}));
var WebboardCategory;
(function (WebboardCategory) {
    WebboardCategory["QA"] = "\u0E16\u0E32\u0E21-\u0E15\u0E2D\u0E1A";
    WebboardCategory["Knowledge"] = "\u0E04\u0E27\u0E32\u0E21\u0E23\u0E39\u0E49";
    WebboardCategory["HowTo"] = "How-to";
    WebboardCategory["General"] = "\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B";
    WebboardCategory["Other"] = "\u0E2D\u0E37\u0E48\u0E19 \u0E46";
})(WebboardCategory || (exports.WebboardCategory = WebboardCategory = {}));
exports.WEBBOARD_CATEGORY_STYLES = (_b = {},
    _b[WebboardCategory.QA] = { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    _b[WebboardCategory.Knowledge] = { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    _b[WebboardCategory.HowTo] = { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    _b[WebboardCategory.General] = { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    _b[WebboardCategory.Other] = { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
    _b);
var JobCategory;
(function (JobCategory) {
    JobCategory["DigitalCreative"] = "\u0E07\u0E32\u0E19\u0E14\u0E34\u0E08\u0E34\u0E17\u0E31\u0E25\u0E41\u0E25\u0E30\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E2A\u0E23\u0E23\u0E04\u0E4C";
    JobCategory["EducationTutoring"] = "\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E41\u0E25\u0E30\u0E15\u0E34\u0E27\u0E40\u0E15\u0E2D\u0E23\u0E4C";
    JobCategory["BusinessAdminSupport"] = "\u0E07\u0E32\u0E19\u0E18\u0E38\u0E23\u0E01\u0E34\u0E08\u0E41\u0E25\u0E30\u0E2A\u0E19\u0E31\u0E1A\u0E2A\u0E19\u0E38\u0E19\u0E07\u0E32\u0E19\u0E18\u0E38\u0E23\u0E01\u0E32\u0E23";
    JobCategory["ITTechnical"] = "\u0E07\u0E32\u0E19\u0E44\u0E2D\u0E17\u0E35\u0E41\u0E25\u0E30\u0E40\u0E17\u0E04\u0E19\u0E34\u0E04";
    JobCategory["SalesEventsPromotion"] = "\u0E07\u0E32\u0E19\u0E02\u0E32\u0E22, \u0E2D\u0E35\u0E40\u0E27\u0E19\u0E15\u0E4C \u0E41\u0E25\u0E30\u0E42\u0E1B\u0E23\u0E42\u0E21\u0E0A\u0E31\u0E19";
    JobCategory["HomeDeliveryLifestyle"] = "\u0E07\u0E32\u0E19\u0E1A\u0E49\u0E32\u0E19, \u0E23\u0E31\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07 \u0E41\u0E25\u0E30\u0E44\u0E25\u0E1F\u0E4C\u0E2A\u0E44\u0E15\u0E25\u0E4C";
    JobCategory["FoodService"] = "\u0E07\u0E32\u0E19\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E41\u0E25\u0E30\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23";
    JobCategory["HealthFitnessWellness"] = "\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E \u0E1F\u0E34\u0E15\u0E40\u0E19\u0E2A \u0E41\u0E25\u0E30\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E27\u0E30";
    JobCategory["ArtsCraftsPerformance"] = "\u0E28\u0E34\u0E25\u0E1B\u0E30 \u0E07\u0E32\u0E19\u0E1D\u0E35\u0E21\u0E37\u0E2D \u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E41\u0E2A\u0E14\u0E07";
    JobCategory["ShortTermMisc"] = "\u0E07\u0E32\u0E19\u0E23\u0E30\u0E22\u0E30\u0E2A\u0E31\u0E49\u0E19\u0E41\u0E25\u0E30\u0E07\u0E32\u0E19\u0E08\u0E34\u0E1B\u0E32\u0E16\u0E30";
})(JobCategory || (exports.JobCategory = JobCategory = {}));
exports.JOB_CATEGORY_EMOJIS_MAP = (_c = {},
    _c[JobCategory.DigitalCreative] = '🎨',
    _c[JobCategory.EducationTutoring] = '📚',
    _c[JobCategory.BusinessAdminSupport] = '💼',
    _c[JobCategory.ITTechnical] = '💻',
    _c[JobCategory.SalesEventsPromotion] = '🎉',
    _c[JobCategory.HomeDeliveryLifestyle] = '🏠',
    _c[JobCategory.FoodService] = '🍽️',
    _c[JobCategory.HealthFitnessWellness] = '💪',
    _c[JobCategory.ArtsCraftsPerformance] = '🎭',
    _c[JobCategory.ShortTermMisc] = '⚡',
    _c);
exports.JOB_CATEGORY_STYLES = (_d = {},
    _d[JobCategory.DigitalCreative] = { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
    _d[JobCategory.EducationTutoring] = { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
    _d[JobCategory.BusinessAdminSupport] = { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    _d[JobCategory.ITTechnical] = { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    _d[JobCategory.SalesEventsPromotion] = { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300' },
    _d[JobCategory.HomeDeliveryLifestyle] = { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    _d[JobCategory.FoodService] = { bg: 'bg-lime-100', text: 'text-lime-700', border: 'border-lime-300' },
    _d[JobCategory.HealthFitnessWellness] = { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
    _d[JobCategory.ArtsCraftsPerformance] = { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', border: 'border-fuchsia-300' },
    _d[JobCategory.ShortTermMisc] = { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
    _d);
var JobSubCategory;
(function (JobSubCategory) {
    JobSubCategory["DigitalCreative_GraphicDesign"] = "\u0E2D\u0E2D\u0E01\u0E41\u0E1A\u0E1A\u0E01\u0E23\u0E32\u0E1F\u0E34\u0E01 (\u0E42\u0E25\u0E42\u0E01\u0E49, \u0E42\u0E1B\u0E2A\u0E40\u0E15\u0E2D\u0E23\u0E4C, \u0E2A\u0E37\u0E48\u0E2D\u0E42\u0E0B\u0E40\u0E0A\u0E35\u0E22\u0E25)";
    JobSubCategory["DigitalCreative_WritingTranslation"] = "\u0E40\u0E02\u0E35\u0E22\u0E19\u0E41\u0E25\u0E30\u0E41\u0E1B\u0E25\u0E20\u0E32\u0E29\u0E32 (\u0E41\u0E1B\u0E25\u0E20\u0E32\u0E29\u0E32, \u0E40\u0E02\u0E35\u0E22\u0E19\u0E1A\u0E17\u0E04\u0E27\u0E32\u0E21, \u0E04\u0E2D\u0E19\u0E40\u0E17\u0E19\u0E15\u0E4C)";
    JobSubCategory["DigitalCreative_WebMobileDev"] = "\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E40\u0E27\u0E47\u0E1A\u0E44\u0E0B\u0E15\u0E4C\u0E41\u0E25\u0E30\u0E41\u0E2D\u0E1B (\u0E40\u0E27\u0E47\u0E1A\u0E44\u0E0B\u0E15\u0E4C, \u0E41\u0E2D\u0E1E\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D)";
    JobSubCategory["DigitalCreative_VideoAudioEditing"] = "\u0E15\u0E31\u0E14\u0E15\u0E48\u0E2D\u0E27\u0E34\u0E14\u0E35\u0E42\u0E2D\u0E41\u0E25\u0E30\u0E40\u0E2A\u0E35\u0E22\u0E07 (\u0E15\u0E31\u0E14\u0E15\u0E48\u0E2D\u0E27\u0E34\u0E14\u0E35\u0E42\u0E2D, \u0E17\u0E33\u0E40\u0E1E\u0E25\u0E07, \u0E1E\u0E32\u0E01\u0E22\u0E4C\u0E40\u0E2A\u0E35\u0E22\u0E07)";
    JobSubCategory["DigitalCreative_MarketingSocialMedia"] = "\u0E01\u0E32\u0E23\u0E15\u0E25\u0E32\u0E14\u0E41\u0E25\u0E30\u0E42\u0E0B\u0E40\u0E0A\u0E35\u0E22\u0E25\u0E21\u0E35\u0E40\u0E14\u0E35\u0E22 (\u0E1A\u0E23\u0E34\u0E2B\u0E32\u0E23\u0E40\u0E1E\u0E08, \u0E42\u0E06\u0E29\u0E13\u0E32\u0E2D\u0E2D\u0E19\u0E44\u0E25\u0E19\u0E4C)";
    JobSubCategory["EducationTutoring_LanguageTeaching"] = "\u0E2A\u0E2D\u0E19\u0E20\u0E32\u0E29\u0E32 (\u0E2A\u0E2D\u0E19\u0E20\u0E32\u0E29\u0E32\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29, \u0E08\u0E35\u0E19, \u0E0D\u0E35\u0E48\u0E1B\u0E38\u0E48\u0E19 \u0E2F\u0E25\u0E2F)";
    JobSubCategory["EducationTutoring_AcademicTutoring"] = "\u0E15\u0E34\u0E27\u0E27\u0E34\u0E0A\u0E32\u0E01\u0E32\u0E23 (\u0E04\u0E13\u0E34\u0E15, \u0E27\u0E34\u0E17\u0E22\u0E4C, \u0E2A\u0E31\u0E07\u0E04\u0E21, \u0E14\u0E19\u0E15\u0E23\u0E35)";
    JobSubCategory["EducationTutoring_ExamPrep"] = "\u0E15\u0E34\u0E27\u0E2A\u0E2D\u0E1A (GAT/PAT, IELTS/TOEFL)";
    JobSubCategory["EducationTutoring_WorkshopCraftTeaching"] = "\u0E2A\u0E2D\u0E19\u0E40\u0E27\u0E34\u0E23\u0E4C\u0E01\u0E0A\u0E47\u0E2D\u0E1B/\u0E07\u0E32\u0E19\u0E1D\u0E35\u0E21\u0E37\u0E2D";
    JobSubCategory["BusinessAdminSupport_DataEntry"] = "\u0E04\u0E35\u0E22\u0E4C\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25";
    JobSubCategory["BusinessAdminSupport_OnlineAssistant"] = "\u0E1C\u0E39\u0E49\u0E0A\u0E48\u0E27\u0E22\u0E2D\u0E2D\u0E19\u0E44\u0E25\u0E19\u0E4C";
    JobSubCategory["BusinessAdminSupport_CustomerService"] = "\u0E1A\u0E23\u0E34\u0E01\u0E32\u0E23\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32";
    JobSubCategory["BusinessAdminSupport_AccountingFinance"] = "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E41\u0E25\u0E30\u0E01\u0E32\u0E23\u0E40\u0E07\u0E34\u0E19";
    JobSubCategory["BusinessAdminSupport_MarketResearch"] = "\u0E07\u0E32\u0E19\u0E27\u0E34\u0E08\u0E31\u0E22/\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E15\u0E25\u0E32\u0E14";
    JobSubCategory["ITTechnical_SoftwareDevelopment"] = "\u0E1E\u0E31\u0E12\u0E19\u0E32\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21";
    JobSubCategory["ITTechnical_ITSupportRepair"] = "\u0E0B\u0E48\u0E2D\u0E21\u0E04\u0E2D\u0E21\u0E41\u0E25\u0E30\u0E0A\u0E48\u0E27\u0E22\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E14\u0E49\u0E32\u0E19\u0E44\u0E2D\u0E17\u0E35";
    JobSubCategory["ITTechnical_AIDataAnalysis"] = "\u0E07\u0E32\u0E19 AI \u0E41\u0E25\u0E30\u0E27\u0E34\u0E40\u0E04\u0E23\u0E32\u0E30\u0E2B\u0E4C\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25";
    JobSubCategory["ITTechnical_WebsiteMaintenance"] = "\u0E14\u0E39\u0E41\u0E25\u0E40\u0E27\u0E47\u0E1A\u0E44\u0E0B\u0E15\u0E4C";
    JobSubCategory["SalesEventsPromotion_SalesPromotionStaff"] = "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E32\u0E22/\u0E42\u0E1B\u0E23\u0E42\u0E21\u0E17\u0E2A\u0E34\u0E19\u0E04\u0E49\u0E32";
    JobSubCategory["SalesEventsPromotion_EventStaffMCFlyer"] = "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2D\u0E35\u0E40\u0E27\u0E19\u0E15\u0E4C/MC/\u0E41\u0E08\u0E01\u0E43\u0E1A\u0E1B\u0E25\u0E34\u0E27";
    JobSubCategory["SalesEventsPromotion_MarketSurveyStaff"] = "\u0E2A\u0E33\u0E23\u0E27\u0E08\u0E15\u0E25\u0E32\u0E14";
    JobSubCategory["SalesEventsPromotion_BoothStaff"] = "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E1A\u0E39\u0E18/\u0E2D\u0E2D\u0E01\u0E1A\u0E39\u0E18";
    JobSubCategory["HomeDeliveryLifestyle_HousekeepingCleaning"] = "\u0E41\u0E21\u0E48\u0E1A\u0E49\u0E32\u0E19/\u0E17\u0E33\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E30\u0E2D\u0E32\u0E14";
    JobSubCategory["HomeDeliveryLifestyle_DeliveryErrands"] = "\u0E23\u0E31\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07/\u0E07\u0E32\u0E19\u0E18\u0E38\u0E23\u0E01\u0E32\u0E23 (\u0E23\u0E31\u0E1A-\u0E2A\u0E48\u0E07\u0E40\u0E2D\u0E01\u0E2A\u0E32\u0E23, \u0E0A\u0E48\u0E27\u0E22\u0E0B\u0E37\u0E49\u0E2D\u0E02\u0E2D\u0E07)";
    JobSubCategory["HomeDeliveryLifestyle_RepairmanHandyman"] = "\u0E0A\u0E48\u0E32\u0E07\u0E0B\u0E48\u0E2D\u0E21/\u0E0B\u0E48\u0E2D\u0E21\u0E41\u0E0B\u0E21 (\u0E0A\u0E48\u0E32\u0E07\u0E44\u0E1F, \u0E0A\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E1B\u0E32)";
    JobSubCategory["HomeDeliveryLifestyle_GardeningPetCare"] = "\u0E14\u0E39\u0E41\u0E25\u0E2A\u0E27\u0E19/\u0E2A\u0E31\u0E15\u0E27\u0E4C\u0E40\u0E25\u0E35\u0E49\u0E22\u0E07 (\u0E40\u0E14\u0E34\u0E19\u0E2A\u0E38\u0E19\u0E31\u0E02, \u0E40\u0E25\u0E35\u0E49\u0E22\u0E07\u0E2A\u0E31\u0E15\u0E27\u0E4C)";
    JobSubCategory["HomeDeliveryLifestyle_MovingHauling"] = "\u0E0A\u0E48\u0E27\u0E22\u0E02\u0E19\u0E22\u0E49\u0E32\u0E22/\u0E23\u0E16\u0E23\u0E31\u0E1A\u0E08\u0E49\u0E32\u0E07";
    JobSubCategory["FoodService_Barista"] = "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E23\u0E49\u0E32\u0E19\u0E01\u0E32\u0E41\u0E1F";
    JobSubCategory["FoodService_KitchenAssistantCook"] = "\u0E1C\u0E39\u0E49\u0E0A\u0E48\u0E27\u0E22\u0E04\u0E23\u0E31\u0E27/\u0E1E\u0E48\u0E2D\u0E04\u0E23\u0E31\u0E27/\u0E41\u0E21\u0E48\u0E04\u0E23\u0E31\u0E27";
    JobSubCategory["FoodService_CateringServing"] = "\u0E08\u0E31\u0E14\u0E40\u0E25\u0E35\u0E49\u0E22\u0E07/\u0E40\u0E2A\u0E34\u0E23\u0E4C\u0E1F\u0E2D\u0E32\u0E2B\u0E32\u0E23";
    JobSubCategory["FoodService_WaiterWaitress"] = "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E40\u0E2A\u0E34\u0E23\u0E4C\u0E1F";
    JobSubCategory["HealthFitnessWellness_PersonalTrainerFitnessCoach"] = "\u0E40\u0E17\u0E23\u0E19\u0E40\u0E19\u0E2D\u0E23\u0E4C\u0E2A\u0E48\u0E27\u0E19\u0E15\u0E31\u0E27/\u0E42\u0E04\u0E49\u0E0A\u0E1F\u0E34\u0E15\u0E40\u0E19\u0E2A";
    JobSubCategory["HealthFitnessWellness_MassageSpa"] = "\u0E19\u0E27\u0E14/\u0E2A\u0E1B\u0E32";
    JobSubCategory["HealthFitnessWellness_YogaPilatesInstructor"] = "\u0E04\u0E23\u0E39\u0E2A\u0E2D\u0E19\u0E42\u0E22\u0E04\u0E30/\u0E1E\u0E34\u0E25\u0E32\u0E17\u0E34\u0E2A";
    JobSubCategory["HealthFitnessWellness_HealthNutritionCoach"] = "\u0E42\u0E04\u0E49\u0E0A\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E/\u0E42\u0E20\u0E0A\u0E19\u0E32\u0E01\u0E32\u0E23";
    JobSubCategory["ArtsCraftsPerformance_HandicraftsGifts"] = "\u0E07\u0E32\u0E19\u0E1D\u0E35\u0E21\u0E37\u0E2D/\u0E02\u0E2D\u0E07\u0E02\u0E27\u0E31\u0E0D\u0E17\u0E33\u0E21\u0E37\u0E2D";
    JobSubCategory["ArtsCraftsPerformance_PhotographyVideography"] = "\u0E16\u0E48\u0E32\u0E22\u0E20\u0E32\u0E1E/\u0E27\u0E34\u0E14\u0E35\u0E42\u0E2D";
    JobSubCategory["ArtsCraftsPerformance_MusicPerformanceSinger"] = "\u0E14\u0E19\u0E15\u0E23\u0E35/\u0E01\u0E32\u0E23\u0E41\u0E2A\u0E14\u0E07/\u0E19\u0E31\u0E01\u0E23\u0E49\u0E2D\u0E07";
    JobSubCategory["ArtsCraftsPerformance_PaintingArtist"] = "\u0E27\u0E32\u0E14\u0E20\u0E32\u0E1E/\u0E28\u0E34\u0E25\u0E1B\u0E34\u0E19";
    JobSubCategory["ShortTermMisc_TemporaryDailyWorker"] = "\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E0A\u0E31\u0E48\u0E27\u0E04\u0E23\u0E32\u0E27/\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19";
    JobSubCategory["ShortTermMisc_SeasonalProjectWork"] = "\u0E07\u0E32\u0E19\u0E15\u0E32\u0E21\u0E24\u0E14\u0E39\u0E01\u0E32\u0E25/\u0E42\u0E1B\u0E23\u0E40\u0E08\u0E01\u0E15\u0E4C";
    JobSubCategory["ShortTermMisc_OtherMiscTasks"] = "\u0E07\u0E32\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E46/\u0E07\u0E32\u0E19\u0E08\u0E34\u0E1B\u0E32\u0E16\u0E30";
})(JobSubCategory || (exports.JobSubCategory = JobSubCategory = {}));
exports.JOB_SUBCATEGORIES_MAP = (_e = {},
    _e[JobCategory.DigitalCreative] = [
        JobSubCategory.DigitalCreative_GraphicDesign,
        JobSubCategory.DigitalCreative_WritingTranslation,
        JobSubCategory.DigitalCreative_WebMobileDev,
        JobSubCategory.DigitalCreative_VideoAudioEditing,
        JobSubCategory.DigitalCreative_MarketingSocialMedia,
    ],
    _e[JobCategory.EducationTutoring] = [
        JobSubCategory.EducationTutoring_LanguageTeaching,
        JobSubCategory.EducationTutoring_AcademicTutoring,
        JobSubCategory.EducationTutoring_ExamPrep,
        JobSubCategory.EducationTutoring_WorkshopCraftTeaching,
    ],
    _e[JobCategory.BusinessAdminSupport] = [
        JobSubCategory.BusinessAdminSupport_DataEntry,
        JobSubCategory.BusinessAdminSupport_OnlineAssistant,
        JobSubCategory.BusinessAdminSupport_CustomerService,
        JobSubCategory.BusinessAdminSupport_AccountingFinance,
        JobSubCategory.BusinessAdminSupport_MarketResearch,
    ],
    _e[JobCategory.ITTechnical] = [
        JobSubCategory.ITTechnical_SoftwareDevelopment,
        JobSubCategory.ITTechnical_ITSupportRepair,
        JobSubCategory.ITTechnical_AIDataAnalysis,
        JobSubCategory.ITTechnical_WebsiteMaintenance,
    ],
    _e[JobCategory.SalesEventsPromotion] = [
        JobSubCategory.SalesEventsPromotion_SalesPromotionStaff,
        JobSubCategory.SalesEventsPromotion_EventStaffMCFlyer,
        JobSubCategory.SalesEventsPromotion_MarketSurveyStaff,
        JobSubCategory.SalesEventsPromotion_BoothStaff,
    ],
    _e[JobCategory.HomeDeliveryLifestyle] = [
        JobSubCategory.HomeDeliveryLifestyle_HousekeepingCleaning,
        JobSubCategory.HomeDeliveryLifestyle_DeliveryErrands,
        JobSubCategory.HomeDeliveryLifestyle_RepairmanHandyman,
        JobSubCategory.HomeDeliveryLifestyle_GardeningPetCare,
        JobSubCategory.HomeDeliveryLifestyle_MovingHauling,
    ],
    _e[JobCategory.FoodService] = [
        JobSubCategory.FoodService_Barista,
        JobSubCategory.FoodService_KitchenAssistantCook,
        JobSubCategory.FoodService_CateringServing,
        JobSubCategory.FoodService_WaiterWaitress,
    ],
    _e[JobCategory.HealthFitnessWellness] = [
        JobSubCategory.HealthFitnessWellness_PersonalTrainerFitnessCoach,
        JobSubCategory.HealthFitnessWellness_MassageSpa,
        JobSubCategory.HealthFitnessWellness_YogaPilatesInstructor,
        JobSubCategory.HealthFitnessWellness_HealthNutritionCoach,
    ],
    _e[JobCategory.ArtsCraftsPerformance] = [
        JobSubCategory.ArtsCraftsPerformance_HandicraftsGifts,
        JobSubCategory.ArtsCraftsPerformance_PhotographyVideography,
        JobSubCategory.ArtsCraftsPerformance_MusicPerformanceSinger,
        JobSubCategory.ArtsCraftsPerformance_PaintingArtist,
    ],
    _e[JobCategory.ShortTermMisc] = [
        JobSubCategory.ShortTermMisc_TemporaryDailyWorker,
        JobSubCategory.ShortTermMisc_SeasonalProjectWork,
        JobSubCategory.ShortTermMisc_OtherMiscTasks,
    ],
    _e);
var UserLevelName;
(function (UserLevelName) {
    UserLevelName["Level1_NewbiePoster"] = "\uD83D\uDC23 \u0E21\u0E37\u0E2D\u0E43\u0E2B\u0E21\u0E48\u0E2B\u0E31\u0E14\u0E42\u0E1E\u0E2A\u0E15\u0E4C";
    UserLevelName["Level2_FieryNewbie"] = "\uD83D\uDD25 \u0E40\u0E14\u0E47\u0E01\u0E43\u0E2B\u0E21\u0E48\u0E44\u0E1F\u0E41\u0E23\u0E07";
    UserLevelName["Level3_RegularSenior"] = "\uD83D\uDC51 \u0E23\u0E38\u0E48\u0E19\u0E1E\u0E35\u0E48\u0E02\u0E32\u0E1B\u0E23\u0E30\u0E08\u0E33";
    UserLevelName["Level4_ClassTeacher"] = "\uD83D\uDCD8 \u0E04\u0E23\u0E39\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E0A\u0E31\u0E49\u0E19";
    UserLevelName["Level5_KnowledgeGuru"] = "\uD83E\uDDE0 \u0E01\u0E39\u0E23\u0E39\u0E1C\u0E39\u0E49\u0E23\u0E2D\u0E1A\u0E23\u0E39\u0E49";
    UserLevelName["Level6_BoardFavorite"] = "\uD83D\uDC96 \u0E02\u0E27\u0E31\u0E0D\u0E43\u0E08\u0E0A\u0E32\u0E27\u0E1A\u0E2D\u0E23\u0E4C\u0E14";
    UserLevelName["Level7_LegendOfHajobjah"] = "\uD83E\uDE84 \u0E15\u0E33\u0E19\u0E32\u0E19\u0E1C\u0E39\u0E49\u0E21\u0E35\u0E02\u0E2D\u0E07\u0E2B\u0E32\u0E08\u0E4A\u0E2D\u0E1A\u0E08\u0E49\u0E32";
})(UserLevelName || (exports.UserLevelName = UserLevelName = {}));
exports.USER_LEVELS = [
    { name: UserLevelName.Level1_NewbiePoster, minScore: 0, colorClass: 'bg-green-200', textColorClass: 'text-green-800' },
    { name: UserLevelName.Level2_FieryNewbie, minScore: 5, colorClass: 'bg-lime-200', textColorClass: 'text-lime-800' },
    { name: UserLevelName.Level3_RegularSenior, minScore: 15, colorClass: 'bg-cyan-200', textColorClass: 'text-cyan-800' },
    { name: UserLevelName.Level4_ClassTeacher, minScore: 30, colorClass: 'bg-amber-300', textColorClass: 'text-amber-800' },
    { name: UserLevelName.Level5_KnowledgeGuru, minScore: 50, colorClass: 'bg-violet-300', textColorClass: 'text-violet-800' },
    { name: UserLevelName.Level6_BoardFavorite, minScore: 80, colorClass: 'bg-pink-300', textColorClass: 'text-pink-800' },
    { name: UserLevelName.Level7_LegendOfHajobjah, minScore: 120, colorClass: 'bg-teal-300', textColorClass: 'text-teal-800' },
];
exports.ADMIN_BADGE_DETAILS = {
    name: "🌟 ผู้พิทักษ์จักรวาล",
    colorClass: 'bg-yellow-100',
    textColorClass: 'text-yellow-800',
};
exports.MODERATOR_BADGE_DETAILS = {
    name: "👮 ผู้ตรวจการ",
    colorClass: 'bg-blue-400',
    textColorClass: 'text-blue-900',
};
exports.ACTIVITY_BADGE_DETAILS = {
    name: "🔥 ขยันใช้เว็บ",
    colorClass: 'bg-orange-200',
    textColorClass: 'text-orange-800',
};
