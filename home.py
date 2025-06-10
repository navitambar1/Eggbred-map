import pgeocode
def state_by_zipCode(zip_code):
    nomi = pgeocode.Nominatim('us')
    zipcode_info = nomi.query_postal_code(zip_code)
    result = zipcode_info
    full_state_name = result.state_name
    city_name = result.place_name
    data = {"state": full_state_name, "city": city_name}
    return data