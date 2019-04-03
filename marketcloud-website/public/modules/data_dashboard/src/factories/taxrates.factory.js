angular.module('Marketcloud.Shared')
  .factory('TaxRates', function() {

      return [{
        "country": "Australia",
        "state": "*",
        "rate": "10.0000",
        "name": "GST",
        "shipping": true,
        "country_code": "AU"
      }, {
        "country": "Bangladesh",
        "state": "*",
        "rate": "15.0000",
        "name": "VAT",
        "shipping": true,
        "country_code": "BD"
      }, {
        "country": "Belgium",
        "state": "*",
        "rate": "21.0000",
        "name": "BTW",
        "shipping": true,
        "country_code": "BE"
      }, {
        "country": "Canada",
        "state": "British Columbia",
        "rate": "7.0000",
        "name": "PST",
        "shipping": false,
        "priority": 2,
        "country_code": "CA",
        "state_code": "BC"
      }, {
        "country": "Canada",
        "state": "Saskatchewan",
        "rate": "5.0000",
        "name": "PST",
        "shipping": false,
        "priority": 2,
        "country_code": "CA",
        "state_code": "SK"
      }, {
        "country": "Canada",
        "state": "Manitoba",
        "rate": "8.0000",
        "name": "PST",
        "shipping": false,
        "priority": 2,
        "country_code": "CA",
        "state_code": "MB"
      }, {
        "country": "Canada",
        "state": "Quebec",
        "rate": "9.975",
        "name": "QST",
        "shipping": false,
        "priority": 2,
        "country_code": "CA",
        "state_code": "QC"
      }, {
        "country": "Canada",
        "state": "Ontario",
        "rate": "13.0000",
        "name": "HST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "ON"
      }, {
        "country": "Canada",
        "state": "Newfoundland and Labrador",
        "rate": "13.0000",
        "name": "HST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "NL"
      }, {
        "country": "Canada",
        "state": "New Brunswick",
        "rate": "13.0000",
        "name": "HST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "NB"
      }, {
        "country": "Canada",
        "state": "Prince Edward Island",
        "rate": "14.0000",
        "name": "HST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "PE"
      }, {
        "country": "Canada",
        "state": "Nova Scotia",
        "rate": "15.0000",
        "name": "HST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "NS"
      }, {
        "country": "Canada",
        "state": "Alberta",
        "rate": "5.0000",
        "name": "GST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "AB"
      }, {
        "country": "Canada",
        "state": "British Columbia",
        "rate": "5.0000",
        "name": "GST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "BC"
      }, {
        "country": "Canada",
        "state": "Northwest Territories",
        "rate": "5.0000",
        "name": "GST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "NT"
      }, {
        "country": "Canada",
        "state": "Nunavut",
        "rate": "5.0000",
        "name": "GST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "NU"
      }, {
        "country": "Canada",
        "state": "Yukon",
        "rate": "5.0000",
        "name": "GST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "YT"
      }, {
        "country": "Canada",
        "state": "Saskatchewan",
        "rate": "5.0000",
        "name": "GST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "SK"
      }, {
        "country": "Canada",
        "state": "Manitoba",
        "rate": "5.0000",
        "name": "GST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "MB"
      }, {
        "country": "Canada",
        "state": "Quebec",
        "rate": "5.0000",
        "name": "GST",
        "shipping": true,
        "country_code": "CA",
        "state_code": "QC"
      }, {
        "country": "Finland",
        "state": "*",
        "rate": "24.0000",
        "name": "ALV",
        "shipping": true,
        "country_code": "FI"
      }, {
        "country": "France",
        "state": "*",
        "rate": "20.0000",
        "name": "TVA",
        "shipping": true,
        "country_code": "FR"
      }, {
        "country": "Germany",
        "state": "*",
        "rate": "19.0000",
        "name": "Mwst.",
        "shipping": true,
        "country_code": "DE"
      }, {
        "country": "Hungary",
        "state": "*",
        "rate": "27.0000",
        "name": "ÁFA",
        "shipping": true,
        "country_code": "HU"
      }, {
        "country": "Italy",
        "state": "*",
        "rate": "22.0000",
        "name": "IVA",
        "shipping": true,
        "country_code": "IT"
      }, {
        "country": "Japan",
        "state": "*",
        "rate": "8.0000",
        "name": "Consumption tax",
        "shipping": true,
        "country_code": "JP"
      }, {
        "country": "Nepal",
        "state": "*",
        "rate": "13.0000",
        "name": "VAT",
        "shipping": true,
        "country_code": "NP"
      }, {
        "country": "Netherlands",
        "state": "*",
        "rate": "21.0000",
        "name": "VAT",
        "shipping": true,
        "country_code": "NL"
      }, {
        "country": "Norway",
        "state": "*",
        "rate": "25.0000",
        "name": "MVA",
        "shipping": true,
        "country_code": "NO"
      }, {
        "country": "Poland",
        "state": "*",
        "rate": "23.0000",
        "name": "VAT",
        "shipping": true,
        "country_code": "PL"
      }, {
        "country": "Romania",
        "state": "*",
        "rate": "19.0000",
        "name": "TVA",
        "shipping": true,
        "country_code": "RO"
      }, {
        "country": "South Africa",
        "state": "*",
        "rate": "14.0000",
        "name": "VAT",
        "shipping": true,
        "country_code": "ZA"
      }, {
        "country": "Spain",
        "state": "*",
        "rate": "21.0000",
        "name": "VAT",
        "shipping": true,
        "country_code": "ES"
      }, {
        "country": "Thailand",
        "state": "*",
        "rate": "7.0000",
        "name": "VAT",
        "shipping": true,
        "country_code": "TH"
      }, {
        "country": "Turkey",
        "state": "*",
        "rate": "18.0000",
        "name": "KDV",
        "shipping": true,
        "country_code": "TR"
      }, {
        "country": "United Kingdom",
        "state": "*",
        "rate": "20.0000",
        "name": "VAT",
        "shipping": true,
        "country_code": "GB"
      }, {
        "country": "United States",
        "state": "Alabama",
        "rate": "4.0000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "AL"
      }, {
        "country": "United States",
        "state": "Arizona",
        "rate": "5.6000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "AZ"
      }, {
        "country": "United States",
        "state": "Arkansas",
        "rate": "6.5000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "AR"
      }, {
        "country": "United States",
        "state": "California",
        "rate": "7.5000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "CA"
      }, {
        "country": "United States",
        "state": "Colorado",
        "rate": "2.9000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "CO"
      }, {
        "country": "United States",
        "state": "Connecticut",
        "rate": "6.3500",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "CT"
      }, {
        "country": "United States",
        "state": "District of Columbia",
        "rate": "5.7500",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "DC"
      }, {
        "country": "United States",
        "state": "Florida",
        "rate": "6.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "FL"
      }, {
        "country": "United States",
        "state": "Georgia",
        "rate": "4.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "GA"
      }, {
        "country": "United States",
        "state": "Guam",
        "rate": "4.0000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "GU"
      }, {
        "country": "United States",
        "state": "Hawaii",
        "rate": "4.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "HI"
      }, {
        "country": "United States",
        "state": "Idaho",
        "rate": "6.0000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "ID"
      }, {
        "country": "United States",
        "state": "Illinois",
        "rate": "6.2500",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "IL"
      }, {
        "country": "United States",
        "state": "Indiana",
        "rate": "7.0000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "IN"
      }, {
        "country": "United States",
        "state": "Iowa",
        "rate": "6.0000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "IA"
      }, {
        "country": "United States",
        "state": "Kansas",
        "rate": "6.1500",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "KS"
      }, {
        "country": "United States",
        "state": "Kentucky",
        "rate": "6.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "KY"
      }, {
        "country": "United States",
        "state": "Louisiana",
        "rate": "4.0000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "LA"
      }, {
        "country": "United States",
        "state": "Maine",
        "rate": "5.5000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "ME"
      }, {
        "country": "United States",
        "state": "Maryland",
        "rate": "6.0000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "MD"
      }, {
        "country": "United States",
        "state": "Massachusetts",
        "rate": "6.2500",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "MA"
      }, {
        "country": "United States",
        "state": "Michigan",
        "rate": "6.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "MI"
      }, {
        "country": "United States",
        "state": "Minnesota",
        "rate": "6.8750",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "MN"
      }, {
        "country": "United States",
        "state": "Mississippi",
        "rate": "7.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "MS"
      }, {
        "country": "United States",
        "state": "Missouri",
        "rate": "4.225",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "MO"
      }, {
        "country": "United States",
        "state": "Nebraska",
        "rate": "5.5000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "NE"
      }, {
        "country": "United States",
        "state": "Nevada",
        "rate": "6.8500",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "NV"
      }, {
        "country": "United States",
        "state": "New Jersey",
        "rate": "7.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "NJ"
      }, {
        "country": "United States",
        "state": "New Mexico",
        "rate": "5.1250",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "NM"
      }, {
        "country": "United States",
        "state": "New York",
        "rate": "4.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "NY"
      }, {
        "country": "United States",
        "state": "North Carolina",
        "rate": "4.7500",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "NC"
      }, {
        "country": "United States",
        "state": "North Dakota",
        "rate": "5.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "ND"
      }, {
        "country": "United States",
        "state": "Ohio",
        "rate": "5.7500",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "OH"
      }, {
        "country": "United States",
        "state": "Oklahoma",
        "rate": "4.5000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "OK"
      }, {
        "country": "United States",
        "state": "Pennsylvania",
        "rate": "6.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "PA"
      }, {
        "country": "United States",
        "state": "Puerto Rico",
        "rate": "6.0000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "PR"
      }, {
        "country": "United States",
        "state": "Rhode Island",
        "rate": "7.0000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "RI"
      }, {
        "country": "United States",
        "state": "South Carolina",
        "rate": "6.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "SC"
      }, {
        "country": "United States",
        "state": "South Dakota",
        "rate": "4.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "SD"
      }, {
        "country": "United States",
        "state": "Tennessee",
        "rate": "7.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "TN"
      }, {
        "country": "United States",
        "state": "Texas",
        "rate": "6.2500",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "TX"
      }, {
        "country": "United States",
        "state": "Utah",
        "rate": "5.9500",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "UT"
      }, {
        "country": "United States",
        "state": "Vermont",
        "rate": "6.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "VT"
      }, {
        "country": "United States",
        "state": "Virginia",
        "rate": "5.3000",
        "name": "State Tax",
        "shipping": false,
        "country_code": "US",
        "state_code": "VA"
      }, {
        "country": "United States",
        "state": "Washington",
        "rate": "6.5000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "WA"
      }, {
        "country": "United States",
        "state": "West Virginia",
        "rate": "6.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "WV"
      }, {
        "country": "United States",
        "state": "Wisconsin",
        "rate": "5.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "WI"
      }, {
        "country": "United States",
        "state": "Wyoming",
        "rate": "4.0000",
        "name": "State Tax",
        "shipping": true,
        "country_code": "US",
        "state_code": "WY"
      }]
    });