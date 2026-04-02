export default function Home() {
  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-blue-900 mb-4">ADVENTIFY</h2>
        <p className="text-xl text-gray-600">Digital Verification Platform for Church Members</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-lg shadow">
          <h3 className="text-2xl font-bold text-blue-900 mb-4">For Church Members</h3>
          <p className="text-gray-600 mb-4">Request and download official certificates and letters</p>
          <a href="/verify" className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Verify Document
          </a>
        </div>

        <div className="bg-white p-8 rounded-lg shadow">
          <h3 className="text-2xl font-bold text-blue-900 mb-4">For Church Clerks</h3>
          <p className="text-gray-600 mb-4">Create certificate and letter requests for members</p>
          <a href="/dashboard/clerk" className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Clerk Dashboard
          </a>
        </div>

        <div className="bg-white p-8 rounded-lg shadow">
          <h3 className="text-2xl font-bold text-blue-900 mb-4">For Church Pastors</h3>
          <p className="text-gray-600 mb-4">Review and approve document requests</p>
          <a href="/dashboard/pastor" className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            Pastor Dashboard
          </a>
        </div>
      </div>

      <div className="mt-16 bg-blue-50 p-8 rounded-lg">
        <h3 className="text-2xl font-bold text-blue-900 mb-4">What is Adventify?</h3>
        <p className="text-gray-700 mb-4">
          Adventify is a digital verification system that enables churches to instantly issue and deliver official certificates and introduction letters to members. Whether it's a baptism certificate, visa support letter, or character reference, Adventify makes it simple and secure.
        </p>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="font-bold text-blue-900 mb-2">✓ Certificates</h4>
            <p className="text-sm text-gray-600">Baptism, youth honors, service recognitions, ordinations, and more</p>
          </div>
          <div>
            <h4 className="font-bold text-blue-900 mb-2">✓ Letters</h4>
            <p className="text-sm text-gray-600">Character references, membership proof, financial capacity, visa support, and more</p>
          </div>
          <div>
            <h4 className="font-bold text-blue-900 mb-2">✓ Secure</h4>
            <p className="text-sm text-gray-600">Digital signatures, QR codes, and complete audit trail</p>
          </div>
          <div>
            <h4 className="font-bold text-blue-900 mb-2">✓ Fast</h4>
            <p className="text-sm text-gray-600">Minutes instead of weeks - instant delivery to members</p>
          </div>
        </div>
      </div>
    </div>
  );
}
