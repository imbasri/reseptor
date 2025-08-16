export default function DetectPage() {
  return (
    <div className="flex flex-col min-h-0 p-4 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              🔍 Deteksi Makanan
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm sm:text-base">
              Fitur deteksi makanan dengan AI vision sedang dalam pengembangan.
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 max-w-md mx-auto">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-yellow-100 dark:bg-yellow-900/40 rounded-full p-3">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                Coming Soon
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                Fitur ini akan memungkinkan Anda mengupload foto makanan untuk mendapatkan informasi nutrisi dan saran resep.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
