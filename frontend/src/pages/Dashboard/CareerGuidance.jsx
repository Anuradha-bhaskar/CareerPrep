import React from 'react';

export default function CareerGuidance() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Career Guidance</h3>
          <p className="text-gray-600">
            Get personalized career advice and guidance to help you navigate your professional journey.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h4 className="font-semibold text-gray-800 mb-3">Career Assessment</h4>
            <p className="text-gray-600 text-sm mb-4">
              Discover your strengths, interests, and potential career paths.
            </p>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">
              Start Assessment
            </button>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h4 className="font-semibold text-gray-800 mb-3">Industry Insights</h4>
            <p className="text-gray-600 text-sm mb-4">
              Get the latest trends and insights about your target industry.
            </p>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">
              View Insights
            </button>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h4 className="font-semibold text-gray-800 mb-3">Skill Development</h4>
            <p className="text-gray-600 text-sm mb-4">
              Identify skill gaps and get recommendations for improvement.
            </p>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">
              Analyze Skills
            </button>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h4 className="font-semibold text-gray-800 mb-3">Career Roadmap</h4>
            <p className="text-gray-600 text-sm mb-4">
              Create a personalized roadmap to achieve your career goals.
            </p>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">
              Create Roadmap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}