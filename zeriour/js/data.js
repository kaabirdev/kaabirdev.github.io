/* ==========================================================================
   Zeriour — demo dataset
   Deterministic seed (regenerates identically on "Reset demo data").
   All records are fictional and exist only in the browser.
   ========================================================================== */
window.ZR = window.ZR || {};
(function (ZR) {
  'use strict';

  /* ---------------------------------------------------------------- statuses */
  ZR.STATUSES = [
    { key: 'created', label: 'Order Created', tone: 'neutral', icon: 'ph-receipt', short: 'Created' },
    { key: 'pickup_requested', label: 'Pickup Requested', tone: 'warn', icon: 'ph-hand-arrow-up', short: 'Pickup requested' },
    { key: 'picked_up', label: 'Picked Up', tone: 'sky', icon: 'ph-package', short: 'Picked up' },
    { key: 'at_origin', label: 'Received at Origin Branch', tone: 'info', icon: 'ph-warehouse', short: 'At origin' },
    { key: 'in_transit', label: 'In Transit', tone: 'progress', icon: 'ph-truck', short: 'In transit' },
    { key: 'at_destination', label: 'Received at Destination Branch', tone: 'info', icon: 'ph-buildings', short: 'At destination' },
    { key: 'assigned', label: 'Assigned to Rider', tone: 'accent', icon: 'ph-user-focus', short: 'Assigned' },
    { key: 'out_for_delivery', label: 'Out for Delivery', tone: 'warn', icon: 'ph-moped', short: 'Out for delivery' },
    { key: 'delivered', label: 'Delivered', tone: 'success', icon: 'ph-check-circle', short: 'Delivered' },
    { key: 'failed', label: 'Delivery Failed', tone: 'danger', icon: 'ph-x-circle', short: 'Failed' },
    { key: 'return_initiated', label: 'Return Initiated', tone: 'danger', icon: 'ph-arrow-u-up-left', short: 'Return initiated' },
    { key: 'returned', label: 'Returned to Merchant', tone: 'neutral', icon: 'ph-arrow-counter-clockwise', short: 'Returned' },
    { key: 'cancelled', label: 'Cancelled', tone: 'danger', icon: 'ph-prohibit', short: 'Cancelled' }
  ];
  ZR.statusIndex = (key) => ZR.STATUSES.findIndex((s) => s.key === key);
  ZR.statusMeta = (key) => ZR.STATUSES[ZR.statusIndex(key)] || ZR.STATUSES[0];

  /* --------------------------------------------------------------- locations */
  const L = [
    { division: 'Dhaka', districts: {
      Dhaka: ['Adabor', 'Badda', 'Cantonment', 'Dhanmondi', 'Gulshan', 'Jatrabari', 'Mirpur', 'Mohammadpur', 'Motijheel', 'Pallabi', 'Ramna', 'Tejgaon', 'Uttara', 'Savar'],
      Gazipur: ['Gazipur Sadar', 'Kaliakair', 'Kapasia', 'Sreepur', 'Tongi'],
      Narayanganj: ['Araihazar', 'Bandar', 'Narayanganj Sadar', 'Rupganj', 'Sonargaon'],
      Tangail: ['Tangail Sadar', 'Kalihati', 'Madhupur', 'Mirzapur', 'Gopalpur'],
      Manikganj: ['Manikganj Sadar', 'Singair', 'Saturia', 'Ghior'],
      Munshiganj: ['Munshiganj Sadar', 'Sreenagar', 'Sirajdikhan', 'Lohajang'],
      Narsingdi: ['Narsingdi Sadar', 'Palash', 'Shibpur', 'Monohardi'],
      Kishoreganj: ['Kishoreganj Sadar', 'Bhairab', 'Bajitpur', 'Kuliarchar'],
      Faridpur: ['Faridpur Sadar', 'Bhanga', 'Boalmari', 'Nagarkanda'],
      Madaripur: ['Madaripur Sadar', 'Shibchar', 'Kalkini', 'Rajoir'],
      Gopalganj: ['Gopalganj Sadar', 'Kashiani', 'Muksudpur', 'Tungipara'],
      Rajbari: ['Rajbari Sadar', 'Goalanda', 'Pangsha', 'Baliakandi'],
      Shariatpur: ['Shariatpur Sadar', 'Naria', 'Zanjira', 'Damudya']
    }},
    { division: 'Chattogram', districts: {
      Chattogram: ['Panchlaish', 'Pahartali', 'Double Mooring', 'Kotwali', 'Halishahar', 'Hathazari', 'Sitakunda', 'Patiya', 'Mirsharai'],
      Cumilla: ['Cumilla Sadar', 'Adarsha Sadar', 'Chandina', 'Laksam', 'Muradnagar', 'Debidwar'],
      "Cox's Bazar": ['Cox\'s Bazar Sadar', 'Chakaria', 'Ramu', 'Teknaf', 'Ukhiya'],
      Brahmanbaria: ['Brahmanbaria Sadar', 'Ashuganj', 'Nabinagar', 'Sarail'],
      Chandpur: ['Chandpur Sadar', 'Hajiganj', 'Kachua', 'Matlab'],
      Feni: ['Feni Sadar', 'Chhagalnaiya', 'Daganbhuiyan', 'Sonagazi'],
      Lakshmipur: ['Lakshmipur Sadar', 'Raipur', 'Ramganj', 'Roypur'],
      Noakhali: ['Noakhali Sadar', 'Begumganj', 'Chatkhil', 'Senbagh'],
      Khagrachhari: ['Khagrachhari Sadar', 'Dighinala', 'Panchhari', 'Ramgarh'],
      Rangamati: ['Rangamati Sadar', 'Kaptai', 'Baghaichhari', 'Kawkhali'],
      Bandarban: ['Bandarban Sadar', 'Lama', 'Ruma', 'Thanchi']
    }},
    { division: 'Sylhet', districts: {
      Sylhet: ['Sylhet Sadar', 'Beanibazar', 'Bishwanath', 'Golapganj', 'Zakiganj', 'Osmani Nagar'],
      Moulvibazar: ['Moulvibazar Sadar', 'Sreemangal', 'Kamalganj', 'Kulaura'],
      Habiganj: ['Habiganj Sadar', 'Madhabpur', 'Nabiganj', 'Chunarughat'],
      Sunamganj: ['Sunamganj Sadar', 'Chatak', 'Jagannathpur', 'Tahirpur']
    }},
    { division: 'Rajshahi', districts: {
      Rajshahi: ['Boalia', 'Motihar', 'Rajpara', 'Shah Makhdum', 'Paba', 'Godagari'],
      Bogura: ['Bogura Sadar', 'Sherpur', 'Shibganj', 'Gabtali', 'Sariakandi'],
      Pabna: ['Pabna Sadar', 'Ishwardi', 'Bera', 'Sujanagar'],
      Sirajganj: ['Sirajganj Sadar', 'Ullapara', 'Shahjadpur', 'Belkuchi'],
      Natore: ['Natore Sadar', 'Singra', 'Baraigram', 'Bagatipara'],
      Naogaon: ['Naogaon Sadar', 'Manda', 'Patnitala', 'Niamatpur'],
      Chapainawabganj: ['Chapainawabganj Sadar', 'Shibganj', 'Gomastapur', 'Nachole'],
      Joypurhat: ['Joypurhat Sadar', 'Akkelpur', 'Kalai', 'Khetlal']
    }},
    { division: 'Khulna', districts: {
      Khulna: ['Khalishpur', 'Sonadanga', 'Daulatpur', 'Khan Jahan Ali', 'Dumuria', 'Rupsha'],
      Jashore: ['Jashore Sadar', 'Abhaynagar', 'Jhikargachha', 'Keshabpur'],
      Jhenaidah: ['Jhenaidah Sadar', 'Kaliganj', 'Kotchandpur', 'Shailkupa'],
      Satkhira: ['Satkhira Sadar', 'Kalaroa', 'Shyamnagar', 'Assasuni'],
      Bagerhat: ['Bagerhat Sadar', 'Mongla', 'Morrelganj', 'Rampal'],
      Kushtia: ['Kushtia Sadar', 'Kumarkhali', 'Bheramara', 'Mirpur'],
      Magura: ['Magura Sadar', 'Sreepur', 'Salikha', 'Mohammadpur'],
      Meherpur: ['Meherpur Sadar', 'Gangni', 'Mujibnagar'],
      Chuadanga: ['Chuadanga Sadar', 'Alamdanga', 'Damurhuda', 'Jibannagar'],
      Narail: ['Narail Sadar', 'Kalia', 'Lohagara', 'Kashiani']
    }},
    { division: 'Rangpur', districts: {
      Rangpur: ['Rangpur Sadar', 'Gangachara', 'Badarganj', 'Pirgachha'],
      Dinajpur: ['Dinajpur Sadar', 'Birampur', 'Parbatipur', 'Phulbari'],
      Gaibandha: ['Gaibandha Sadar', 'Gobindaganj', 'Palashbari', 'Sundarganj'],
      Kurigram: ['Kurigram Sadar', 'Nageshwari', 'Rajarhat', 'Ulipur'],
      Lalmonirhat: ['Lalmonirhat Sadar', 'Aditmari', 'Hatibandha', 'Patgram'],
      Nilphamari: ['Nilphamari Sadar', 'Saidpur', 'Jaldhaka', 'Domar'],
      Panchagarh: ['Panchagarh Sadar', 'Boda', 'Debiganj', 'Tetulia'],
      Thakurgaon: ['Thakurgaon Sadar', 'Pirganj', 'Baliadangi', 'Ranisankail']
    }},
    { division: 'Barishal', districts: {
      Barishal: ['Barishal Sadar', 'Bakerganj', 'Babuganj', 'Banaripara'],
      Patuakhali: ['Patuakhali Sadar', 'Galachipa', 'Kalapara', 'Bauphal'],
      Bhola: ['Bhola Sadar', 'Char Fasson', 'Lalmohan', 'Daulatkhan'],
      Pirojpur: ['Pirojpur Sadar', 'Bhandaria', 'Mathbaria', 'Nazirpur'],
      Barguna: ['Barguna Sadar', 'Amtali', 'Patharghata', 'Bamna'],
      Jhalokathi: ['Jhalokathi Sadar', 'Nalchity', 'Kathalia', 'Rajapur']
    }},
    { division: 'Mymensingh', districts: {
      Mymensingh: ['Mymensingh Sadar', 'Trishal', 'Bhaluka', 'Muktagachha', 'Gaffargaon'],
      Jamalpur: ['Jamalpur Sadar', 'Sarishabari', 'Islampur', 'Dewanganj'],
      Netrokona: ['Netrokona Sadar', 'Kendua', 'Atpara', 'Mohanganj'],
      Sherpur: ['Sherpur Sadar', 'Nalitabari', 'Sreebardi', 'Nakla']
    }}
  ];
  ZR.LOCATIONS = L;
  ZR.DISTRICTS = L.flatMap((d) => Object.keys(d.districts).map((name) => ({ name, division: d.division, upazilas: d.districts[name] })));
  ZR.REMOTE = ['Bandarban', 'Rangamati', 'Khagrachhari', 'Panchagarh', 'Kurigram', 'Barguna', 'Bhola', 'Patuakhali', 'Sunamganj'];
  ZR.DISTRICT_MAP = Object.fromEntries(ZR.DISTRICTS.map((d) => [d.name, d]));
  ZR.upazilasOf = (district) => (ZR.DISTRICT_MAP[district] ? ZR.DISTRICT_MAP[district].upazilas : []);

  /* ------------------------------------------------------------------- RNG */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ----------------------------------------------------------------- seed */
  function buildSeed() {
    const rnd = mulberry32(20240918);
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const int = (min, max) => Math.floor(rnd() * (max - min + 1)) + min;
    const flt = (min, max, dp = 1) => +(rnd() * (max - min) + min).toFixed(dp);
    const uid = (p, i) => `${p}_${String(i).padStart(4, '0')}`;
    const NOW = Date.now();
    const DAY = 86400000;
    const ago = (days, h = 0) => new Date(NOW - days * DAY - h * 3600000).toISOString();
    const phone = () => `+8801${pick(['3', '4', '5', '6', '7', '8', '9'])}${String(int(10000000, 99999999))}`;

    const firstNames = ['Md. Rakibul', 'Nusrat', 'Tanvir', 'Sharmin', 'Abdul', 'Farhan', 'Sumaiya', 'Jahid', 'Mitu', 'Rafiul', 'Sadia', 'Imran', 'Tasnim', 'Mahmudul', 'Afsana', 'Shakil', 'Rumana', 'Nazmul', 'Fahmida', 'Arif', 'Lamia', 'Sabbir', 'Jannatul', 'Habib', 'Rehnuma', 'Anisur', 'Tania', 'Sohel', 'Mariam', 'Kamrul'];
    const lastNames = ['Hasan', 'Jahan', 'Ahmed', 'Akter', 'Karim', 'Kabir', 'Islam', 'Hossain', 'Das', 'Rahman', 'Chowdhury', 'Sarkar', 'Mia', 'Begum', 'Alam', 'Sultana', 'Uddin', 'Talukder', 'Bhuiyan', 'Sheikh'];

    const SHOP_NAMES = [
      'Nokshi Kuthir', 'Padma Organics', 'UrbanCart BD', 'Meghna Mart', 'Shonar Bangla Crafts',
      'TechNest Bangladesh', 'Bela Beauty', 'Kagoj Stationery', 'Sultana\u2019s Kitchen', 'Bazar Buddy',
      'Green Valley Agro', 'Lumina Lifestyle'
    ];

    const merchants = SHOP_NAMES.map((name, i) => {
      const district = ['Dhaka', 'Dhaka', 'Chattogram', 'Dhaka', 'Rajshahi', 'Dhaka', 'Sylhet', 'Dhaka', 'Khulna', 'Gazipur', 'Bogura', 'Dhaka'][i];
      const owner = `${pick(firstNames)} ${pick(lastNames)}`;
      return {
        id: uid('mer', i + 1),
        name,
        owner,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, '')}@demo.com`,
        phone: phone(),
        businessType: pick(['Fashion & Apparel', 'FMCG', 'Electronics', 'Handicrafts', 'Beauty', 'Stationery', 'Food & Grocery', 'Agro']),
        address: `${int(4, 88)}, Road ${int(2, 21)}, ${pick(['Dhanmondi', 'Banani', 'Uttara', 'Mirpur', 'Gulshan', 'Mohammadpur', 'Bashundhara'])}`,
        district,
        status: i === 10 ? 'pending' : i === 11 ? 'suspended' : 'active',
        plan: pick(['Growth', 'Scale', 'Starter']),
        commission: pick([3.5, 4, 4.5, 5]),
        balance: int(4200, 186000),
        pending: int(1800, 74000),
        lifetime: int(180000, 2400000),
        createdAt: ago(int(60, 700)),
        store: {
          name,
          subdomain: name.toLowerCase().replace(/[^a-z]+/g, '') + '.zeriour.store',
          pickupAddress: `Warehouse ${int(1, 9)}, ${pick(['Tejgaon I/A', 'Badda Link Road', 'Uttara Sector 7', 'Agrabad C/A', 'Mirpur 10'])}`,
          returnAddress: `${int(4, 88)}, Road ${int(2, 21)}, ${district}`
        },
        api: {
          key: `zr_live_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`,
          created: ago(int(30, 300)),
          webhook: 'https://merchant.example.com/webhooks/zeriour',
          events: ['parcel.delivered', 'parcel.failed', 'payment.settled']
        }
      };
    });

    const branchDefs = [
      ['DHK-01', 'Motijheel Hub', 'Dhaka', 'Motijheel', 'Level 3, Adamjee Court Annex, Motijheel C/A'],
      ['DHK-02', 'Mirpur Sorting Centre', 'Dhaka', 'Mirpur', 'Plot 12, Mirpur 10 Circle, Dhaka'],
      ['GAZ-01', 'Gazipur Branch', 'Gazipur', 'Tongi', 'Holding 44, Dhaka-Tongi Road, Tongi'],
      ['CHT-01', 'Chattogram Port Branch', 'Chattogram', 'Double Mooring', 'Agrabad C/A, Chattogram 4100'],
      ['SYL-01', 'Sylhet City Branch', 'Sylhet', 'Sylhet Sadar', 'Zindabazar Point, Sylhet 3100'],
      ['RAJ-01', 'Rajshahi Branch', 'Rajshahi', 'Boalia', 'Shaheb Bazar Zero Point, Rajshahi'],
      ['KHL-01', 'Khulna Branch', 'Khulna', 'Sonadanga', 'Sonadanga Bus Terminal, Khulna'],
      ['TGL-01', 'Tangail Branch', 'Tangail', 'Tangail Sadar', 'Victoria Road, Tangail']
    ];
    const branches = branchDefs.map((b, i) => ({
      id: uid('br', i + 1), code: b[0], name: b[1], district: b[2], thana: b[3], address: b[4],
      manager: `${pick(firstNames)} ${pick(lastNames)}`, phone: phone(),
      staff: int(4, 22), capacity: int(600, 2400), active: true,
      createdAt: ago(int(300, 1200))
    }));

    const riderNames = ['Sohel Rana', 'Mizanur Rahman', 'Jashim Uddin', 'Rasel Ahmed', 'Shahin Alam', 'Nazmul Huda', 'Al-Amin Sheikh', 'Tuhin Mia', 'Rakib Hossain', 'Sabbir Ahmed'];
    const zoneByBranch = {
      'DHK-01': ['Motijheel–Dhanmondi', 'Jatrabari–Ramna', 'Motijheel–Paltan'],
      'DHK-02': ['Mirpur–Kazipara', 'Uttara–Airport', 'Mohammadpur–Adabor'],
      'GAZ-01': ['Tongi–Gazipur Sadar', 'Kaliakair–Sreepur'],
      'CHT-01': ['Agrabad–Halishahar', 'Panchlaish–Kotwali'],
      'SYL-01': ['Zindabazar–Subid Bazar', 'Sylhet Sadar–Beanibazar'],
      'RAJ-01': ['Shaheb Bazar–Kazla', 'Boalia–Motihar'],
      'KHL-01': ['Sonadanga–Khalishpur', 'Daulatpur–Rupsha'],
      'TGL-01': ['Tangail Sadar–Kalihati', 'Mirzapur–Madhupur']
    };
    const zoneSeq = {};
    const riders = riderNames.map((name, i) => {
      const branch = branches[[0, 1, 1, 3, 4, 5, 6, 7, 1, 0][i]];
      const zones = zoneByBranch[branch.code] || ['City centre'];
      const zIdx = zoneSeq[branch.code] = (zoneSeq[branch.code] || 0);
      zoneSeq[branch.code] = zIdx + 1;
      return {
        id: uid('rdr', i + 1),
        name, phone: phone(),
        branchId: branch.id,
        zone: zones[zIdx % zones.length],
        vehicle: pick(['Motorcycle', 'Motorcycle', 'E-bike', 'Bicycle']),
        rating: flt(4.2, 4.9),
        deliveries: int(320, 2100),
        successRate: flt(92, 99.2),
        earnings: int(4800, 16500),
        status: i === 8 ? 'on_leave' : i === 9 ? 'suspended' : 'active',
        joined: ago(int(120, 900))
      };
    });

    const staff = [
      { id: 'stf_0001', name: 'Mizanur Rahman', role: 'Branch Manager', branchId: branches[0].id, phone: phone(), email: 'mizanur@zeriour.demo', status: 'active', joined: ago(420) },
      { id: 'stf_0002', name: 'Sharmin Akter', role: 'Sorting Supervisor', branchId: branches[0].id, phone: phone(), email: 'sharmin@zeriour.demo', status: 'active', joined: ago(300) },
      { id: 'stf_0003', name: 'Rasel Ahmed', role: 'Scanning Operator', branchId: branches[0].id, phone: phone(), email: 'rasel@zeriour.demo', status: 'active', joined: ago(180) },
      { id: 'stf_0004', name: 'Tania Islam', role: 'Cashier', branchId: branches[0].id, phone: phone(), email: 'tania@zeriour.demo', status: 'active', joined: ago(240) },
      { id: 'stf_0005', name: 'Jahid Hossain', role: 'Branch Manager', branchId: branches[1].id, phone: phone(), email: 'jahid@zeriour.demo', status: 'active', joined: ago(500) },
      { id: 'stf_0006', name: 'Sumaiya Jahan', role: 'Sorting Supervisor', branchId: branches[1].id, phone: phone(), email: 'sumaiya@zeriour.demo', status: 'active', joined: ago(150) }
    ];

    /* customers */
    const customerRows = [];
    for (let i = 0; i < 90; i++) {
      const dist = pick(ZR.DISTRICTS);
      const upa = pick(dist.upazilas);
      customerRows.push({
        id: uid('cus', i + 1),
        name: `${pick(firstNames)} ${pick(lastNames)}`,
        phone: phone(),
        altPhone: rnd() > 0.6 ? phone() : '',
        address: `House ${int(2, 140)}, Road ${int(1, 26)}`,
        district: dist.name,
        upazila: upa,
        area: `${upa} Zone ${pick(['A', 'B', 'C'])}`,
        orders: int(1, 24),
        createdAt: ago(int(10, 500))
      });
    }

    /* pricing config */
    const settings = {
      brand: 'Zeriour',
      supportPhone: '+880 9612 300 400',
      supportEmail: 'support@zeriour.demo',
      pricing: {
        base: 60,
        includedKg: 1,
        perKg: 20,
        codRate: 1.2,
        codMin: 10,
        remoteSurcharge: 35,
        vat: 0,
        types: [
          { id: 'standard', name: 'Standard', multiplier: 1, eta: '2–4 business days', desc: 'Reliable nationwide delivery through our branch network.' },
          { id: 'express', name: 'Express', multiplier: 1.6, eta: '24–48 hours', desc: 'Priority handling with next-day delivery to major cities.' },
          { id: 'sameday', name: 'Same-Day', multiplier: 2.4, eta: '6–12 hours', desc: 'Metro-to-metro same-day delivery, order before 11:00 AM.' }
        ]
      },
      codCommission: 1.2,
      payoutCycle: 'Weekly (every Tuesday)',
      returnWindow: 7,
      maxWeight: 20,
      maintenanceMode: false
    };

    /* parcels */
    const products = [
      'Cotton panjabi (L)', 'Handloom saree', 'Wireless earbuds', 'Organic mustard oil 1L', 'Leather wallet',
      'Kids\u2019 frock set', 'Stainless steel tiffin box', 'Herbal face wash', 'Nakshi kantha cushion cover',
      'Bluetooth speaker', 'Ceramic tea set', 'Jamdani scarf', 'Basmati rice 5kg', 'Formal shirt (M)',
      'Smart watch strap', 'Aroma candle set', 'Jute tote bag', 'Notebook bundle', 'Sneakers size 42'
    ];
    const weights = [0.3, 0.5, 0.7, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5.5, 8];

    const STATUS_WEIGHTS = [
      ['delivered', 34], ['in_transit', 12], ['out_for_delivery', 8], ['at_destination', 6],
      ['assigned', 5], ['at_origin', 6], ['picked_up', 5], ['pickup_requested', 4],
      ['created', 5], ['failed', 5], ['return_initiated', 5], ['returned', 5]
    ];
    const statusPool = STATUS_WEIGHTS.flatMap(([k, w]) => Array(w).fill(k));

    const parcels = [];
    for (let i = 0; i < 78; i++) {
      // first three parcels back the demo tracking IDs shown on the public site
      const statusKey = i === 0 ? 'delivered' : i === 1 ? 'in_transit' : i === 2 ? 'out_for_delivery'
        : statusPool[Math.floor(rnd() * statusPool.length)];
      const sIdx = ZR.statusIndex(statusKey);
      const merchant = merchants[int(0, 9)]; // exclude the suspended / pending merchant from history
      const dist = pick(ZR.DISTRICTS);
      const upa = pick(dist.upazilas);
      const origin = branches.filter((b) => b.district === merchant.district)[0] || branches[0];
      // regional hubs cover every district in their division
      const hubByDivision = { Dhaka: 'DHK-01', Chattogram: 'CHT-01', Sylhet: 'SYL-01', Rajshahi: 'RAJ-01', Khulna: 'KHL-01', Rangpur: 'RAJ-01', Barishal: 'KHL-01', Mymensingh: 'TGL-01' };
      const dest = branches.filter((b) => b.district === dist.name)[0]
        || branches.filter((b) => b.code === hubByDivision[dist.division])[0]
        || branches[0];
      const weight = pick(weights);
      const cod = rnd() > 0.18 ? int(3, 120) * 100 : 0;
      const type = rnd() > 0.82 ? 'express' : rnd() > 0.94 ? 'sameday' : 'standard';
      const typeCfg = settings.pricing.types.find((t) => t.id === type);
      const baseCharge = Math.round(settings.pricing.base * typeCfg.multiplier);
      const extraKg = Math.max(0, Math.ceil(weight) - settings.pricing.includedKg);
      const weightCharge = extraKg * settings.pricing.perKg;
      const remote = ZR.REMOTE.includes(dist.name) ? settings.pricing.remoteSurcharge : 0;
      const codCharge = cod > 0 ? Math.max(Math.round(cod * settings.pricing.codRate / 100), settings.pricing.codMin) : 0;
      const deliveryCharge = baseCharge + weightCharge + remote;
      const daysAgo = sIdx >= 8 ? int(3, 45) : sIdx >= 6 ? int(3, 12) : sIdx >= 4 ? int(2, 9) : int(0, 9);
      const created = ago(daysAgo, int(0, 8));
      const customer = customerRows[int(0, customerRows.length - 1)];
      const customer2 = { ...customer, district: dist.name, upazila: upa, address: `House ${int(2, 140)}, Road ${int(1, 26)}`, area: `${upa} Zone ${pick(['A', 'B', 'C'])}` };

      const rider = riders[int(0, 9)];
      const parcel = {
        id: uid('pcl', i + 1),
        tracking: 'ZR' + String(4829103756 + i * 137).slice(0, 10),
        merchantId: merchant.id,
        merchantName: merchant.name,
        customer: customer2,
        weight,
        type,
        cod,
        deliveryCharge,
        codCharge,
        weightCharge,
        remoteCharge: remote,
        product: pick(products),
        status: sIdx,
        statusKey,
        originBranchId: origin.id,
        destBranchId: dest.id,
        riderId: sIdx >= 6 && sIdx <= 9 ? rider.id : null,
        bagId: sIdx >= 4 && sIdx <= 7 ? `BAG-${int(1000, 1200)}` : null,
        createdAt: created,
        updatedAt: created,
        eta: new Date(new Date(created).getTime() + int(2, 5) * DAY).toISOString(),
        notes: rnd() > 0.7 ? pick(['Please call before delivery.', 'Fragile — handle with care.', 'Deliver after 6 PM.', 'Customer prefers WhatsApp update.']) : '',
        pickupLocation: merchant.store.pickupAddress,
        invoiceNo: `INV-24${String(int(10000, 99999))}`,
        timeline: [],
        attempts: sIdx === 9 ? int(1, 2) : 1,
        returnReason: sIdx === 10 || sIdx === 11 ? pick(['Customer refused the parcel', 'Max delivery attempts reached', 'Wrong address']) : ''
      };

      // timeline
      const byBranch = origin.code;
      const destBranch = dest;
      const evt = (idx, at, by, note) => ({
        status: ZR.STATUSES[idx].key,
        label: ZR.STATUSES[idx].label,
        at,
        by,
        note: note || ''
      });
      const t0 = new Date(created).getTime();
      const stepAt = (h) => new Date(t0 + h * 3600000).toISOString();
      parcel.timeline.push(evt(0, created, 'Merchant portal', `Parcel created by ${merchant.name}`));
      if (sIdx >= 1) parcel.timeline.push(evt(1, stepAt(1), 'Pickup desk', 'Pickup request confirmed'));
      if (sIdx >= 2) parcel.timeline.push(evt(2, stepAt(5), 'Rider pickup', 'Parcel collected from merchant'));
      if (sIdx >= 3) parcel.timeline.push(evt(3, stepAt(7), byBranch, `Received at ${origin.name}`));
      if (sIdx >= 4) parcel.timeline.push(evt(4, stepAt(16), byBranch, `Dispatched to ${destBranch.code}`));
      if (sIdx >= 5) parcel.timeline.push(evt(5, stepAt(34), destBranch.code, `Received at ${destBranch.name}`));
      if (sIdx >= 6) parcel.timeline.push(evt(6, stepAt(37), destBranch.code, `Assigned to ${riders.find((r) => r.id === parcel.riderId)?.name || 'delivery rider'}`));
      if (sIdx >= 7) parcel.timeline.push(evt(7, stepAt(40), 'Rider app', 'Out for delivery'));
      if (sIdx >= 8 && sIdx !== 10 && sIdx !== 11) parcel.timeline.push(evt(8, stepAt(44), 'Rider app', 'Delivered and COD collected'));
      if (sIdx === 9) parcel.timeline.push(evt(9, stepAt(44), 'Rider app', parcel.returnReason));
      if (sIdx >= 10) {
        parcel.timeline.push(evt(9, stepAt(44), 'Rider app', 'Customer unavailable after 2 attempts'));
        parcel.timeline.push(evt(10, stepAt(50), destBranch.code, 'Return initiated by branch'));
      }
      if (sIdx === 11) parcel.timeline.push(evt(11, stepAt(72), 'Returns desk', 'Parcel returned to merchant'));
      parcel.updatedAt = parcel.timeline[parcel.timeline.length - 1].at;
      if (sIdx === 8) parcel.deliveredAt = parcel.updatedAt;
      parcels.push(parcel);
    }

    // a couple of demo parcels with known tracking ids referenced on the site
    const demoIds = ['ZR4829103756', 'ZR4829103893', 'ZR4829104030'];
    parcels.forEach((p, i) => {
      if (i < 3) p.tracking = demoIds[i];
    });

    // make the seeded demo workspaces feel populated for the demo accounts
    parcels.slice(0, 14).forEach((p) => {
      p.merchantId = 'mer_0001';
      p.merchantName = merchants[0].name;
    });

    /* --- recency: make "today" and the last week look alive --- */
    const dhakaAreas = ['Motijheel', 'Dhanmondi', 'Paltan', 'Ramna', 'Jatrabari', 'Tejgaon', 'Mohammadpur', 'Gulshan'];
    const stamp = (back, hour, minute) => {
      const d = new Date(NOW);
      d.setDate(d.getDate() - back);
      d.setHours(hour, minute, 0, 0);
      return d.toISOString();
    };
    const delivered = parcels.filter((p) => p.statusKey === 'delivered' && (NOW - new Date(p.createdAt).getTime()) > 2 * DAY);
    delivered.sort((a, b) => (b.merchantId === merchants[0].id ? 1 : 0) - (a.merchantId === merchants[0].id ? 1 : 0));
    delivered.forEach((p, i) => {
      const back = i < 4 ? 0 : (i % 7);
      const at = stamp(back, 10 + (i % 8), (i * 11) % 60);
      const ev = p.timeline.filter((t) => t.status === 'delivered')[0];
      if (ev) ev.at = at;
      p.deliveredAt = at;
      p.updatedAt = at;
      p.codCollected = p.cod;
    });

    // a few fresh orders so every "today" view has intake
    parcels.filter((p) => p.status <= 2).slice(0, 3).forEach((p, i) => {
      const at = stamp(0, 8 + i, 5 + i * 9);
      p.createdAt = at;
      p.timeline.forEach((t, j) => { t.at = new Date(new Date(at).getTime() + j * 47 * 60000).toISOString(); });
      p.updatedAt = p.timeline[p.timeline.length - 1].at;
    });

    // Sohel Rana runs a Dhaka-metro route: completed drops plus a live task list
    const sohel = riders[0];
    const dhakaDrop = (p) => {
      const upa = pick(dhakaAreas);
      p.customer = { ...p.customer, district: 'Dhaka', upazila: upa, address: `House ${int(2, 120)}, Road ${int(1, 24)}`, area: `${upa} Zone ${pick(['A', 'B', 'C'])}` };
      p.originBranchId = 'br_0001';
      p.destBranchId = 'br_0001';
      p.riderId = sohel.id;
      p.notes = p.notes || pick(['Please call before delivery.', 'Deliver after 6 PM.', 'Customer prefers a WhatsApp update.']);
      const assigned = p.timeline.filter((t) => t.status === 'assigned')[0];
      if (assigned) { assigned.by = 'DHK-01'; assigned.note = `Assigned to ${sohel.name}`; }
    };
    const sohelDelivered = delivered.filter((p) => p.cod > 0).slice(0, 3);
    sohelDelivered.forEach(dhakaDrop);
    sohelDelivered.forEach((p, i) => {
      p.deliveredAt = stamp(0, 11 + i, 10 + i * 12);
      p.updatedAt = p.deliveredAt;
      const ev = p.timeline.filter((t) => t.status === 'delivered')[0];
      if (ev) ev.at = p.deliveredAt;
    });
    parcels.filter((p) => p.destBranchId === 'br_0001' && [6, 7].includes(p.status) && p.riderId !== sohel.id)
      .slice(0, 4).forEach(dhakaDrop);
    // keep one mid-attempt parcel so the failed-delivery flow is demonstrable
    const failedDemo = parcels.filter((p) => p.status === 7 && p.destBranchId === 'br_0001' && p.riderId !== sohel.id)[0];
    if (failedDemo) dhakaDrop(failedDemo);

    // a rider's active and failed tasks always sit inside their own city
    parcels.forEach((p) => {
      if (p.riderId === sohel.id && p.destBranchId !== 'br_0001' && [6, 7, 9].includes(p.status)) dhakaDrop(p);
    });
    // give the Motijheel hub a fuller inbound queue (and coherent Dhaka addresses)
    parcels.filter((p) => [4, 5].includes(p.status) && p.destBranchId !== 'br_0001').slice(0, 5).forEach((p) => {
      const oldBranch = branches.filter((b) => b.id === p.destBranchId)[0] || branches[0];
      const upa = pick(dhakaAreas);
      p.customer = { ...p.customer, district: 'Dhaka', upazila: upa, address: `House ${int(2, 120)}, Road ${int(1, 24)}`, area: `${upa} Zone ${pick(['A', 'B', 'C'])}` };
      p.destBranchId = 'br_0001';
      p.riderId = null;
      p.timeline.forEach((t) => {
        if (t.note && t.note.indexOf(oldBranch.name) > -1) t.note = `Received at Motijheel Hub`;
        if (t.note && t.note.indexOf(oldBranch.code) > -1) t.note = t.note.split(oldBranch.code).join('DHK-01');
        if (t.by === oldBranch.code) t.by = 'DHK-01';
      });
    });

    // top up the live route from parcels already received at the Dhaka hub
    parcels.filter((p) => p.destBranchId === 'br_0001' && p.status === 5 && !p.riderId).slice(0, 3).forEach((p, i) => {
      dhakaDrop(p);
      p.status = 6;
      p.statusKey = 'assigned';
      p.updatedAt = stamp(0, 9, 10 + i * 6);
      p.timeline.push({ status: 'assigned', label: 'Assigned to Rider', at: p.updatedAt, by: 'DHK-01', note: `Assigned to ${sohel.name}` });
    });

    // no timeline event may sit in the future (keeps relative times honest)
    parcels.forEach((p) => {
      const last = p.timeline[p.timeline.length - 1];
      if (!last) return;
      const lastMs = new Date(last.at).getTime();
      if (lastMs <= NOW - 60000) return;
      const shift = lastMs - (NOW - 60000);
      p.timeline.forEach((t) => { t.at = new Date(new Date(t.at).getTime() - shift).toISOString(); });
      p.createdAt = new Date(new Date(p.createdAt).getTime() - shift).toISOString();
      p.updatedAt = p.timeline[p.timeline.length - 1].at;
      if (p.deliveredAt) p.deliveredAt = new Date(new Date(p.deliveredAt).getTime() - shift).toISOString();
    });

    /* transactions & payouts */
    const transactions = [];
    parcels.filter((p) => p.statusKey === 'delivered').forEach((p, i) => {
      transactions.push({
        id: uid('txn', i * 2 + 1), merchantId: p.merchantId, type: 'cod_collection',
        amount: p.cod, fee: p.codCharge, status: 'settled',
        reference: p.tracking, date: p.updatedAt, parcelId: p.id,
        note: 'COD collected on delivery'
      });
      transactions.push({
        id: uid('txn', i * 2 + 2), merchantId: p.merchantId, type: 'delivery_charge',
        amount: -p.deliveryCharge, fee: 0, status: 'settled',
        reference: p.tracking, date: p.updatedAt, parcelId: p.id,
        note: 'Delivery charge deducted'
      });
    });
    merchants.forEach((m, i) => {
      if (i % 3 === 0) transactions.push({
        id: uid('payout', i + 1), merchantId: m.id, type: 'payout', amount: -int(8000, 60000),
        fee: 0, status: 'settled', reference: `PO-24${int(10000, 99999)}`, date: ago(int(3, 20)),
        note: 'Weekly payout to bank account'
      });
    });
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const withdrawals = [
      { id: 'wd_0001', merchantId: 'mer_0001', amount: 45000, method: 'bKash Merchant', account: '01711-234567', status: 'pending', date: ago(0, 4) },
      { id: 'wd_0002', merchantId: 'mer_0003', amount: 28000, method: 'Bank Transfer', account: 'City Bank •••• 8842', status: 'pending', date: ago(1, 2) },
      { id: 'wd_0003', merchantId: 'mer_0002', amount: 12000, method: 'Bank Transfer', account: 'BRAC Bank •••• 1129', status: 'approved', date: ago(6) },
      { id: 'wd_0004', merchantId: 'mer_0005', amount: 9600, method: 'Nagad', account: '01988-776655', status: 'approved', date: ago(9) },
      { id: 'wd_0005', merchantId: 'mer_0004', amount: 52000, method: 'Bank Transfer', account: 'DBBL •••• 3390', status: 'rejected', date: ago(12) }
    ];

    const pickups = parcels.filter((p) => p.status <= 2).slice(0, 9).map((p, i) => ({
      id: uid('pck', i + 1), merchantId: p.merchantId, merchantName: p.merchantName,
      parcelCount: int(1, 14), weight: flt(2, 32), address: p.pickupLocation,
      district: ZR.DISTRICT_MAP ? (merchants.find((m) => m.id === p.merchantId) || merchants[0]).district : 'Dhaka',
      date: ago(-int(0, 2)), window: pick(['10:00 – 13:00', '14:00 – 17:00', '16:00 – 19:00']),
      status: pick(['pending', 'scheduled', 'picked']), riderId: riders[int(0, 9)].id
    }));

    // Sohel's assigned collections keep the rider pickup screen useful
    pickups.unshift(
      { id: 'pck_0101', merchantId: merchants[0].id, merchantName: merchants[0].name, parcelCount: 7, weight: 14.6, address: merchants[0].store.pickupAddress, district: merchants[0].district, date: ago(-1), window: '14:00 – 17:00', status: 'scheduled', riderId: 'rdr_0001' },
      { id: 'pck_0102', merchantId: merchants[3].id, merchantName: merchants[3].name, parcelCount: 4, weight: 8.2, address: merchants[3].store.pickupAddress, district: merchants[3].district, date: ago(0), window: '10:00 – 13:00', status: 'pending', riderId: 'rdr_0001' }
    );

    const tickets = [
      { id: 'tkt_0001', merchantId: 'mer_0001', subject: 'COD settlement not received for last week', category: 'Finance', priority: 'high', status: 'open', createdAt: ago(0, 6), messages: [{ by: 'merchant', text: 'Our COD settlement for ZR4829103756 and 11 other parcels has not appeared in this week\u2019s payout.', at: ago(0, 6) }] },
      { id: 'tkt_0002', merchantId: 'mer_0004', subject: 'Rider marked delivered but customer says otherwise', category: 'Delivery', priority: 'urgent', status: 'in_progress', createdAt: ago(1, 3), messages: [{ by: 'merchant', text: 'Customer confirms they never received the order. Delivery photo shows a different building.', at: ago(1, 3) }, { by: 'admin', text: 'We are reviewing the rider\u2019s delivery proof and will update within 24 hours.', at: ago(0, 9) }] },
      { id: 'tkt_0003', merchantId: 'mer_0002', subject: 'Bulk CSV import failing on phone numbers', category: 'Technical', priority: 'medium', status: 'resolved', createdAt: ago(4), messages: [{ by: 'merchant', text: 'CSV with +880 numbers imports as text and validation fails.', at: ago(4) }, { by: 'admin', text: 'Fixed — use the updated template with the Phone (text) column. Thanks for reporting!', at: ago(3) }] },
      { id: 'tkt_0004', merchantId: 'mer_0006', subject: 'Request to increase COD limit', category: 'Account', priority: 'low', status: 'open', createdAt: ago(2, 5), messages: [{ by: 'merchant', text: 'We are scaling to 400 parcels per week and need a higher COD limit.', at: ago(2, 5) }] },
      { id: 'tkt_0005', merchantId: 'mer_0003', subject: 'Pickup rider arrived outside time window', category: 'Pickup', priority: 'medium', status: 'closed', createdAt: ago(8), messages: [{ by: 'merchant', text: 'Pickup arrived at 20:30 instead of the 14:00–17:00 window.', at: ago(8) }] }
    ];

    const bags = [
      { id: 'BAG-1042', originBranchId: branches[1].id, destBranchId: branches[3].id, parcelCount: 24, weight: 38.5, status: 'in_transit', sealedAt: ago(0, 9), sealedBy: 'Rasel Ahmed' },
      { id: 'BAG-1043', originBranchId: branches[1].id, destBranchId: branches[4].id, parcelCount: 16, weight: 22.1, status: 'dispatched', sealedAt: ago(0, 6), sealedBy: 'Sharmin Akter' },
      { id: 'BAG-1045', originBranchId: branches[2].id, destBranchId: branches[0].id, parcelCount: 12, weight: 15.2, status: 'open', sealedAt: null, sealedBy: null }
    ];

    // consignments built from real parcels so every manifest prints actual rows
    const bagGroups = {};
    parcels.filter((p) => p.originBranchId === 'br_0001' && p.destBranchId !== 'br_0001' && [3, 4].includes(p.status))
      .forEach((p) => { (bagGroups[p.destBranchId] = bagGroups[p.destBranchId] || []).push(p); });
    let openBagsUsed = 0;
    Object.entries(bagGroups).slice(0, 4).forEach(([destId, group], i) => {
      const id = 'BAG-' + (1050 + i);
      group.forEach((p) => { p.bagId = id; });
      const allTransit = group.every((p) => p.status === 4);
      const status = allTransit ? 'dispatched' : (openBagsUsed++ === 0 ? 'sealed' : 'open');
      bags.unshift({
        id, originBranchId: 'br_0001', destBranchId: destId,
        parcelCount: group.length,
        weight: +group.reduce((sum, p) => sum + p.weight, 0).toFixed(1),
        status,
        sealedAt: status === 'open' ? null : ago(0, i + 2),
        sealedBy: status === 'open' ? null : 'Rasel Ahmed'
      });
    });

    const coupons = [
      { code: 'ZRSTART20', type: 'percent', value: 20, minOrder: 500, uses: 148, limit: 500, expires: '2024-12-31', status: 'active' },
      { code: 'DHAKAFREE', type: 'free_delivery', value: 0, minOrder: 1500, uses: 96, limit: 200, expires: '2024-11-30', status: 'active' },
      { code: 'EIDSHIP50', type: 'flat', value: 50, minOrder: 800, uses: 320, limit: 320, expires: '2024-06-30', status: 'expired' },
      { code: 'NEWMERCHANT', type: 'percent', value: 15, minOrder: 0, uses: 41, limit: 1000, expires: '2025-03-31', status: 'active' }
    ];

    const logs = [
      { id: 'log_0001', actor: 'Admin (Tahmid)', role: 'admin', action: 'Approved merchant application for “Green Valley Agro”', target: 'mer_0011', at: ago(0, 2), type: 'merchant' },
      { id: 'log_0002', actor: 'System', role: 'system', action: 'Weekly COD payout batch completed — ৳4,82,600', target: 'payout-batch', at: ago(0, 5), type: 'finance' },
      { id: 'log_0003', actor: 'Sumaiya Jahan', role: 'branch', action: 'Created consignment BAG-1042 (24 parcels)', target: 'BAG-1042', at: ago(0, 9), type: 'logistics' },
      { id: 'log_0004', actor: 'Admin (Tahmid)', role: 'admin', action: 'Updated Express delivery multiplier from 1.5 to 1.6', target: 'pricing', at: ago(1, 2), type: 'settings' },
      { id: 'log_0005', actor: 'Branch DHK-01', role: 'branch', action: 'Processed 46 inbound parcels', target: 'br_0001', at: ago(1, 6), type: 'logistics' },
      { id: 'log_0006', actor: 'Admin (Nadia)', role: 'admin', action: 'Suspended “Lumina Lifestyle” — repeated COD policy violations', target: 'mer_0012', at: ago(2, 3), type: 'merchant' }
    ];

    const notifications = [
      { id: 'ntf_0001', audience: 'admin', title: '2 withdrawal requests awaiting review', body: 'Total value ৳73,000 is pending approval.', tone: 'warn', icon: 'ph-wallet', read: false, at: ago(0, 1), link: '#/withdrawals' },
      { id: 'ntf_0002', audience: 'admin', title: 'Return rate crossed 5% in Chattogram', body: 'CHT-01 has 14 returns this week. Review failed-delivery reasons.', tone: 'danger', icon: 'ph-warning', read: false, at: ago(0, 4), link: '#/returns' },
      { id: 'ntf_0003', audience: 'admin', title: 'New merchant application', body: 'Green Valley Agro submitted business documents.', tone: 'info', icon: 'ph-storefront', read: false, at: ago(0, 8), link: '#/merchants' },
      { id: 'ntf_0010', audience: 'mer_0001', title: 'Parcel delivered', body: 'ZR4829103756 was delivered successfully.', tone: 'success', icon: 'ph-check-circle', read: false, at: ago(0, 2), link: '#/parcels' },
      { id: 'ntf_0011', audience: 'mer_0001', title: 'Payout scheduled', body: '৳18,420 will be transferred on Tuesday.', tone: 'info', icon: 'ph-bank', read: false, at: ago(1, 3), link: '#/finance' },
      { id: 'ntf_0012', audience: 'mer_0001', title: 'Delivery failed — action needed', body: 'ZR4829104030 failed delivery. Parcel will retry tomorrow.', tone: 'warn', icon: 'ph-warning', read: true, at: ago(2, 6), link: '#/parcels' },
      { id: 'ntf_0020', audience: 'branch', title: 'Inbound consignment arriving', body: 'BAG-1042 with 24 parcels arrives from DHK-02 at 14:30.', tone: 'info', icon: 'ph-truck', read: false, at: ago(0, 3), link: '#/incoming' },
      { id: 'ntf_0021', audience: 'branch', title: '14 parcels awaiting sorting', body: 'Clear the sorting bay before the 16:00 dispatch cut-off.', tone: 'warn', icon: 'ph-stack', read: false, at: ago(0, 5), link: '#/sorting' },
      { id: 'ntf_0030', audience: 'rdr_0001', title: 'New delivery assigned', body: 'You have 3 new parcels in Dhanmondi–Mohammadpur.', tone: 'info', icon: 'ph-package', read: false, at: ago(0, 1), link: '#/tasks' },
      { id: 'ntf_0031', audience: 'rdr_0001', title: 'COD reminder', body: 'Deposit the COD you collected at the branch by 7 PM.', tone: 'warn', icon: 'ph-wallet', read: false, at: ago(0, 4), link: '#/earnings' }
    ];

    const users = [
      { id: 'usr_admin', name: 'Tahmid Chowdhury', role: 'admin', title: 'Super Admin', email: 'admin@demo.com', password: '123456', phone: '+8801711000111', initials: 'TC' },
      { id: 'usr_merchant', name: 'Nusrat Jahan', role: 'merchant', title: 'Merchant Owner', email: 'merchant@demo.com', password: '123456', phone: '+8801811222333', merchantId: 'mer_0001', initials: 'NJ' },
      { id: 'usr_branch', name: 'Mizanur Rahman', role: 'branch', title: 'Branch Manager · DHK-01', email: 'branch@demo.com', password: '123456', phone: '+8801911333444', branchId: 'br_0001', initials: 'MR' },
      { id: 'usr_rider', name: 'Sohel Rana', role: 'rider', title: 'Delivery Agent', email: 'rider@demo.com', password: '123456', phone: '+8801611444555', riderId: 'rdr_0001', initials: 'SR' }
    ];

    const staffRoles = [
      { name: 'Super Admin', users: 2, perms: ['All modules', 'Settings', 'Finance', 'User management'] },
      { name: 'Operations Manager', users: 4, perms: ['Parcels', 'Branches', 'Riders', 'Reports'] },
      { name: 'Finance Officer', users: 3, perms: ['COD', 'Payments', 'Withdrawals', 'Reports'] },
      { name: 'Support Agent', users: 6, perms: ['Tickets', 'Merchants (read)', 'Parcels (read)'] },
      { name: 'Branch Manager', users: 8, perms: ['Branch parcels', 'Sorting', 'Riders', 'Manifests'] }
    ];

    const areas = ZR.DISTRICTS.map((d, i) => ({
      district: d.name, division: d.division, upazilas: d.upazilas.length,
      service: ZR.REMOTE.includes(d.name) ? 'restricted' : 'full',
      branch: (branches.find((b) => b.district === d.name) || {}).name || '—',
      avgDays: ZR.REMOTE.includes(d.name) ? '3–5' : (['Dhaka', 'Chattogram'].includes(d.name) ? '1–2' : '2–4')
    }));

    return {
      version: 9,
      createdAt: new Date(NOW).toISOString(),
      settings,
      users,
      merchants,
      branches,
      riders,
      staff,
      customers: customerRows,
      parcels,
      transactions,
      withdrawals,
      pickups,
      tickets,
      bags,
      coupons,
      logs,
      notifications,
      areas,
      staffRoles,
      announcements: [
        { id: 'ann_1', title: 'Eid rush cut-off times', body: 'Last dispatch for standard delivery before Eid is 20 Ramadan. Express cut-off is 24 Ramadan, 11:00 AM.', audience: 'all', status: 'published', date: ago(3) },
        { id: 'ann_2', title: 'New Chattogram sorting hub', body: 'Our Agrabad facility now handles 4,000 parcels per day with a second dispatch at 18:00.', audience: 'all', status: 'published', date: ago(12) }
      ]
    };
  }

  ZR.seedData = buildSeed;
})(window.ZR);
