import json
import requests
from flask import Flask, render_template, jsonify, request
import pandas as pd
import os
import csv
import mysql.connector
from home import state_by_zipCode
from datetime import datetime
import time

app = Flask(__name__)
API_KEY = "AIzaSyCmxt9MdmhDOTDpVz3xLriP_uIe8bCTApc" 

def connect_to_database():
    try:
        mydb = mysql.connector.connect(
            host="localhost",
            user="root",
            password="root",
            database="eggbred$newDB"
        )
        print("Connection successfull")
        return mydb
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None

# Function route to insert data into mysql server 
@app.route('/save_regions', methods=['POST'])
def save_regions():
    data = request.get_json()
    selected_regions = data.get('selectedRegions', [])
    selected_region_groups = data.get('selectedRegionGroups', [])
    
    if not selected_regions or not selected_region_groups:
        return jsonify({'status': 'error', 'message': 'No data to save'})

    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})

    try:
        with connection.cursor() as cursor:
            for group in selected_region_groups:
                zip_codes = ','.join(group.get('zipCodes', []))  
                cursor.execute("SELECT id FROM selectedregiongroups WHERE id = %s", (group['id'],))
                existing_group = cursor.fetchone()
                if not existing_group:
                    cursor.execute("""
                        INSERT INTO selectedregiongroups (id, name, color, demographics, classificationText, franchisee, numDevelopments, zipCodes, state)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        group['id'],
                        group['name'],
                        group['color'],
                        json.dumps(group['demographics']),
                        group.get('classificationText', 'Default Classification'),
                        group.get('franchisee', ''),
                        group.get('numDevelopments', 0),
                        zip_codes,
                        group.get('state', '')
                    ))
            for region in selected_regions:
                cursor.execute("""
                    INSERT INTO selectedregions (displayName, placeId, featureType, lat, lng, groupId, color, postalCode, classificationText, coordinates)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        displayName = VALUES(displayName),
                        featureType = VALUES(featureType),
                        lat = VALUES(lat),
                        lng = VALUES(lng),
                        groupId = VALUES(groupId),
                        color = VALUES(color),
                        postalCode = VALUES(postalCode),
                        classificationText = VALUES(classificationText),
                        coordinates = VALUES(coordinates)
                """, (
                    region.get('displayName'),
                    region.get('placeId'),
                    region.get('featureType'),
                    region.get('lat', 0),
                    region.get('lng', 0),
                    region.get('groupId', 0),  
                    region.get('color', 'rgb(0,0,0)'),
                    region.get('postalCode', '00000'),
                    region.get('classificationText'),
                    json.dumps(region.get('coordinates', []))
                ))
        connection.commit()
        return jsonify({'status': 'success', 'message': 'Regions saved successfully!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if connection:
            connection.close()

@app.route('/load_regions', methods=['GET'])
def load_regions():
    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT id, name, color, demographics, classificationText, label, franchisee, numDevelopments, zipCodes, state FROM selectedregiongroups")
            region_groups = cursor.fetchall()
            for group in region_groups:
                group['demographics'] = json.loads(group['demographics']) if group['demographics'] else {}
            cursor.execute("SELECT displayName, placeId, featureType, lat, lng, groupId, color, postalCode, classificationText, coordinates FROM selectedregions")
            regions = cursor.fetchall()
            for region in regions:
                region['coordinates'] = json.loads(region['coordinates']) if region['coordinates'] else []
                print(jsonify({'status': 'success','regions': regions,'regionGroups': region_groups}))
        return jsonify({
            'status': 'success',
            'regions': regions,
            'regionGroups': region_groups
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if connection:
            connection.close()
            
@app.route('/delete_region_group', methods=['POST'])
def delete_region_group():
    data = request.get_json()
    group_id = data.get('groupId')
    if not group_id:
        return jsonify({'status': 'error', 'message': 'Group ID is required'})
    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})
    try:
        with connection.cursor() as cursor:
            # Delete associated regions
            cursor.execute("DELETE FROM selectedregions WHERE groupId = %s", (group_id,))
            # Delete the region group
            cursor.execute("DELETE FROM selectedregiongroups WHERE id = %s", (group_id,))

        connection.commit()
        return jsonify({'status': 'success', 'message': 'Region group and associated regions deleted successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if connection:
            connection.close()

@app.route('/update_region_group', methods=['POST'])
def update_region_group():
    data = request.get_json()
    print("RECEIVED DATA FROM AJAX CALL:", data)
    group_id = data.get('groupId')
    group_name = data.get('name')
    group_color = data.get('color')
    demographics = data.get('demographics', None)
    classification_text = data.get('classificationText', "Unclassified")
    regions = data.get('regions', [])
    franchisee = data.get('franchisee', '')
    num_developments = data.get('numDevelopments', 0)
    zip_codes = data.get('zipCodes', [])
    state = data.get('state', '')
    label = data.get('label', 'area') 

    if not group_id:
        return jsonify({'status': 'error', 'message': 'Group ID is required'})
    
    for region in regions:
        if 'placeId' not in region:
            return jsonify({'status': 'error', 'message': 'Each region must have a placeId'})

    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})

    try:
        with connection.cursor() as cursor:
            # Get existing demographics if not provided
            if demographics is None:
                cursor.execute("SELECT demographics FROM selectedregiongroups WHERE id = %s", (group_id,))
                current_demographics = cursor.fetchone()
                demographics = current_demographics[0] if current_demographics else {}

            # Convert zip_codes list to string
            zip_codes_str = ','.join(zip_codes) if isinstance(zip_codes, list) else zip_codes

            # Update the group with all fields including label
            cursor.execute("""
                UPDATE selectedregiongroups
                SET name = %s, 
                    color = %s, 
                    demographics = %s, 
                    classificationText = %s,
                    franchisee = %s,
                    numDevelopments = %s,
                    zipCodes = %s,
                    state = %s,
                    label = %s
                WHERE id = %s
            """, (
                group_name, 
                group_color, 
                json.dumps(demographics), 
                classification_text,
                franchisee,
                num_developments,
                zip_codes_str,
                state,
                label,
                group_id
            ))

            # Delete existing regions for this group
            cursor.execute("DELETE FROM selectedregions WHERE groupId = %s", (group_id,))

            # Insert updated regions
            for region in regions:
                cursor.execute("""
                    INSERT INTO selectedregions 
                        (displayName, placeId, featureType, lat, lng, groupId, 
                         color, postalCode, classificationText, coordinates)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    region.get('displayName'),
                    region.get('placeId'),
                    region.get('featureType'),
                    region.get('lat', 0),
                    region.get('lng', 0),
                    group_id,
                    region.get('color', 'rgb(0,0,0)'),
                    region.get('postalCode', '00000'),
                    region.get('In Negotiation'),
                    json.dumps(region.get('coordinates', []))
                ))

        connection.commit()
        return jsonify({
            'status': 'success', 
            'message': 'Region group and associated regions updated successfully'
        })

    except Exception as e:
        print("Error occurred:", e)
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if connection:
            connection.close()
            
@app.route('/save_notes', methods=['POST'])
def save_note():
    data = request.get_json()
    group_id = data.get('groupId')
    note = data.get('note')
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if not group_id or not note:
        return jsonify({'status': 'error', 'message': 'Missing group ID or note content'})
    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})
    try:
        with connection.cursor() as cursor:
            full_note = f"{timestamp} - {note}"
            cursor.execute("""
                UPDATE selectedregiongroups
                SET notes = %s
                WHERE id = %s
            """, (full_note, group_id))
        connection.commit()
        return jsonify({'status': 'success', 'message': 'Note saved successfully'})
    except Exception as e:
        print("Error saving note:", e)
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        connection.close()

@app.route('/save_notes_radial', methods=['POST'])
def save_notes_radial():
    data = request.get_json()
    group_id = data.get('groupId')
    note = data.get('note')
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if not group_id or not note:
        return jsonify({'status': 'error', 'message': 'Missing group ID or note content'})
    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})
    try:
        with connection.cursor() as cursor:
            full_note = f"{timestamp} - {note}"
            cursor.execute("""
                UPDATE selectedregiongroups
                SET notes = %s
                WHERE id = %s
            """, (full_note, group_id))
        connection.commit()
        return jsonify({'status': 'success', 'message': 'Note saved successfully'})
    except Exception as e:
        print("Error saving note:", e)
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        connection.close()
        
@app.route('/save_notes_recruitment', methods=['POST'])
def save_notes_recruitment():
    data = request.get_json()
    group_id = data.get('groupId')
    note = data.get('note')
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if not group_id or not note:
        return jsonify({'status': 'error', 'message': 'Missing group ID or note content'})
    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})
    try:
        with connection.cursor() as cursor:
            full_note = f"{timestamp} - {note}"
            cursor.execute("""
                UPDATE selectedRegionGroupsRecruitment
                SET notes = %s
                WHERE id = %s
            """, (full_note, group_id))
        connection.commit()
        return jsonify({'status': 'success', 'message': 'Note saved successfully'})
    except Exception as e:
        print("Error saving note:", e)
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        connection.close()
           
@app.route('/save_regions_recruitment', methods=['POST'])
def save_regions_recruitment():
    data = request.get_json()
    selectedRegionsRecruitment = data.get('selectedRegionsRecruitment', [])
    selectedRegionGroupsRecruitment = data.get('selectedRegionGroupsRecruitment', [])

    if not selectedRegionsRecruitment or not selectedRegionGroupsRecruitment:
        return jsonify({'status': 'error', 'message': 'No data to save'})

    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})

    try:
        with connection.cursor() as cursor:
            # Insert groups first if they don't exist
            for group in selectedRegionGroupsRecruitment:
                zipCodesRecruitment = ','.join(group.get('zipCodesRecruitment', []))
                print("Group", group)
                cursor.execute("SELECT id FROM selectedRegionGroupsRecruitment WHERE id = %s", (group['id'],))
                existing_group = cursor.fetchone()

                if not existing_group:
                    cursor.execute("""
                        INSERT INTO selectedRegionGroupsRecruitment (id, name, color, demographics, classificationText, recruitmentArea, PotStoreCount, zipCodesRecruitment,stateRecruitment, category)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        group['id'],
                        group['name'],
                        group['color'],
                        json.dumps(group['demographics']),
                        group.get('Under Construction'),
                        group.get('recruitmentArea', ''),
                        group.get('PotStoreCount', 0),
                        zipCodesRecruitment,  # Store zip codes as a single string
                        group.get('stateRecruitment', ''),
                        group.get('category', 'Primary Area')
                    ))

            # Now insert regions, which should have a valid group_id
            for region in selectedRegionsRecruitment:
                print("REGIONS", region)
                cursor.execute("""
                    INSERT INTO selectedRegionsRecruitment (displayName, placeId, featureType, lat, lng, groupId, color, postalCode, classificationText, coordinates)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        displayName = VALUES(displayName),
                        featureType = VALUES(featureType),
                        lat = VALUES(lat),
                        lng = VALUES(lng),
                        groupId = VALUES(groupId),
                        color = VALUES(color),
                        postalCode = VALUES(postalCode),
                        classificationText = VALUES(classificationText),
                        coordinates = VALUES(coordinates)
                """, (
                    region.get('displayName'),
                    region.get('placeId'),
                    region.get('featureType'),
                    region.get('lat', 0),
                    region.get('lng', 0),
                    region.get('groupId', 0),  # The group_id must exist by now
                    region.get('color', 'rgb(0,0,0)'),
                    region.get('postalCode', '00000'),
                    region.get('classificationText'),
                    json.dumps(region.get('coordinates', []))
                ))

        connection.commit()
        return jsonify({'status': 'success', 'message': 'Regions saved successfully!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if connection:
            connection.close()
            
@app.route('/load_regions_recruitment', methods=['GET'])
def load_regions_recruitment():
    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT id, name, color, demographics, classificationText, label, recruitmentArea, PotStoreCount, category, zipCodesRecruitment, stateRecruitment FROM selectedRegionGroupsRecruitment")
            region_groups = cursor.fetchall()
            print("region groups for recruitment analysis:- ",region_groups)
            for group in region_groups:
                group['demographics'] = json.loads(group['demographics']) if group['demographics'] else {}
            cursor.execute("SELECT displayName, placeId, featureType, lat, lng, groupId, color, postalCode, classificationText, coordinates FROM selectedRegionsRecruitment")
            regions = cursor.fetchall()
            for region in regions:
                region['coordinates'] = json.loads(region['coordinates']) if region['coordinates'] else []
        print(jsonify({'status': 'success', 'regions': regions, 'regionGroups': region_groups}))
        return jsonify({
            'status': 'success',
            'regions': regions,
            'regionGroups': region_groups
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if connection:
            connection.close()
            
@app.route('/delete_region_group_recruitment', methods=['POST'])
def delete_region_group_recruitment():
    data = request.get_json()
    group_id = data.get('groupId')
    if not group_id:
        return jsonify({'status': 'error', 'message': 'Group ID is required'})
    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})
    try:
        with connection.cursor() as cursor:
            # Delete associated regions
            cursor.execute("DELETE FROM selectedRegionsRecruitment WHERE groupId = %s", (group_id,))
            # Delete the region group
            cursor.execute("DELETE FROM selectedRegionGroupsRecruitment WHERE id = %s", (group_id,))

        connection.commit()
        return jsonify({'status': 'success', 'message': 'Region group and associated regions deleted successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if connection:
            connection.close()

@app.route('/update_region_group_recruitment', methods=['POST'])
def update_region_group_recruitment():
    data = request.get_json()
    print("Data for updating table Recruitment:- ", data)
    group_id = data.get('groupId')
    group_name = data.get('name')
    group_color = data.get('color')
    demographics = data.get('demographics', {})
    classification_text = data.get('classificationText', "Under Construction")
    regions = data.get('regions', [])
    recruitmentArea = data.get('recruitmentArea', '')
    PotStoreCount = data.get('PotStoreCount', 0)
    zipCodesRecruitment = data.get('zipCodesRecruitment', [])
    stateRecruitment = data.get('stateRecruitment', '')
    category = data.get('category', 'Primary Area')
    if not group_id:
        return jsonify({'status': 'error', 'message': 'Group ID is required'})
    for region in regions:
        if 'placeId' not in region:
            return jsonify({'status': 'error', 'message': 'Each region must have a placeId'})
    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})
    try:
        with connection.cursor() as cursor:
            if demographics is None:
                cursor.execute("SELECT demographics FROM selectedregiongroups WHERE id = %s", (group_id,))
                current_demographics = cursor.fetchone()
                demographics = current_demographics[0] if current_demographics else {}
            zip_codes_str = ','.join(zipCodesRecruitment) if isinstance(zipCodesRecruitment, list) else zipCodesRecruitment
            cursor.execute("""
                UPDATE selectedRegionGroupsRecruitment
                SET name = %s,
                color = %s, 
                demographics = %s, 
                classificationText = %s,
                recruitmentArea = %s,
                PotStoreCount = %s,
                zipCodesRecruitment = %s,
                stateRecruitment = %s,
                category = %s
                WHERE id = %s
            """, (group_name, 
                  group_color, 
                  json.dumps(demographics), 
                  classification_text, 
                  recruitmentArea,
                  PotStoreCount,
                  zip_codes_str,
                  stateRecruitment,
                  category,
                  group_id
                  ))
            cursor.execute("DELETE FROM selectedRegionsRecruitment WHERE groupId = %s", (group_id,))
            for region in regions:
                cursor.execute("""
                    INSERT INTO selectedRegionsRecruitment 
                        (displayName, placeId, featureType, lat, lng, groupId, 
                         color, postalCode, classificationText, coordinates)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        displayName = VALUES(displayName),
                        featureType = VALUES(featureType),
                        lat = VALUES(lat),
                        lng = VALUES(lng),
                        color = VALUES(color),
                        classificationText = VALUES(classificationText),
                        coordinates = VALUES(coordinates)
                """, (
                    region['displayName'],
                    region['placeId'],
                    region['featureType'],
                    region['lat'],
                    region['lng'],
                    group_id,
                    region['color'],
                    region['postalCode'],
                    region['classificationText'],
                    json.dumps(region.get('coordinates', []))
                ))
        connection.commit()
        return jsonify({'status': 'success', 'message': 'Region group and associated regions updated successfully'})
    except Exception as e:
        print("Error occurred:", e)
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if connection:
            connection.close()

@app.route('/save_note_recruitment', methods=['POST'])
def save_note_recruitment():
    data = request.get_json()
    group_id = data.get('groupId')
    note = data.get('note')
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    if not group_id or not note:
        return jsonify({'status': 'error', 'message': 'Missing group ID or note content'})
    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})
    try:
        with connection.cursor() as cursor:
            full_note = f"{timestamp} - {note}"
            cursor.execute("""
                UPDATE selectedRegionGroupsRecruitment
                SET notes = %s
                WHERE id = %s
            """, (full_note, group_id))
        connection.commit()
        return jsonify({'status': 'success', 'message': 'Note saved successfully'})
    except Exception as e:
        print("Error saving note:", e)
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        connection.close()

@app.route('/save_circles', methods=['POST'])
def save_circles():
    try:
        data = request.get_json()
        conn = connect_to_database()
        if not data:
            return jsonify({"success": False, "message": "No data received"}), 400
        with conn.cursor() as cursor:
            for key, circle in data.items():
                query = """
                    INSERT INTO map_circles (
                    id, name, color, classification_text, 
                    center_lat, center_lng, radius, 
                    demographics, places, 
                    franchiseeNumber, city, state, address, autocomplete_value
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    color = VALUES(color),
                    classification_text = VALUES(classification_text),
                    center_lat = VALUES(center_lat),
                    center_lng = VALUES(center_lng),
                    radius = VALUES(radius),
                    demographics = VALUES(demographics),
                    places = VALUES(places),
                    franchiseeNumber = VALUES(franchiseeNumber),
                    city = VALUES(city),
                    state = VALUES(state),
                    address = VALUES(address),
                    autocomplete_value = VALUES(autocomplete_value)
                """
                cursor.execute(query, (
                    circle['id'],
                    circle['name'],
                    circle['color'],
                    circle['classificationText'],
                    circle['center']['lat'],
                    circle['center']['lng'],
                    circle['radius'],
                    json.dumps(circle['demographics']),
                    json.dumps(circle['places']),
                    circle.get('franchiseeNumber', ''),
                    circle.get('city', ''),
                    circle.get('state', ''),
                    circle.get('autocomplete_value', '')
                ))

        # Commit the transaction and close the connection
        conn.commit()
        return jsonify({'status': 'success', 'message': 'Regions saved successfully!'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if conn:
            conn.close()

@app.route('/get_all_circles', methods=['GET'])
def get_all_circles():
    try:
        conn = connect_to_database()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM map_circles")
            rows = cursor.fetchall()
            circles = {}
            for row in rows:
                circle_id = row[0]  
                circles[circle_id] = {
                    'id': row[0],
                    'name': row[1],
                    'color': row[2],
                    'classificationText': row[3],
                    'center': {
                        'lat': row[4],
                        'lng': row[5]
                    },
                    'radius': row[6],
                    'demographics': json.loads(row[7]) if row[7] else None,
                    'places': json.loads(row[8]) if row[8] else None,
                    'franchiseeNumber': row[9] if len(row) > 9 else '',
                    'city': row[10] if len(row) > 10 else '',
                    'state': row[11] if len(row) > 11 else '',
                    'address': row[12] if len(row) > 12 else ''
                }
        return jsonify({'status': 'success', 'data': circles})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if conn:
            conn.close()

@app.route('/delete_circle/<circle_id>', methods=['DELETE'])
def delete_circle(circle_id):
    try:
        conn = connect_to_database()
        with conn.cursor() as cursor:
            query = "DELETE FROM map_circles WHERE id = %s"
            cursor.execute(query, (circle_id,))
        conn.commit()
        return jsonify({'status': 'success', 'message': f'Circle with id {circle_id} deleted successfully.'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if conn:
            conn.close()

@app.route('/update_circle/<circle_id>', methods=['PUT'])
def update_circle(circle_id):
    try:
        # Parse incoming JSON data
        data = request.get_json()
        if not data:
            return jsonify({'status': 'error', 'message': 'No data received'}), 400
        conn = connect_to_database()
        with conn.cursor() as cursor:
            query = """
                UPDATE map_circles
                    SET name = %s,
                        color = %s,
                        classification_text = %s,
                        center_lat = %s,
                        center_lng = %s,
                        radius = %s,
                        demographics = %s,
                        places = %s,
                        franchiseeNumber = %s,
                        city = %s,
                        state = %s,
                        address = %s
                    WHERE id = %s
            """
            cursor.execute(query, (
                data['name'],
                data['color'],
                data.get('classificationText', 'Unclassified'),
                data['center']['lat'],
                data['center']['lng'],
                data['radius'],
                json.dumps(data.get('demographics', {})),
                json.dumps(data.get('places', [])),
                data.get('franchiseeNumber', ''),
                data.get('city', ''),
                data.get('state', ''),
                data.get('address', ''),
                circle_id
            ))
        conn.commit()
        return jsonify({'status': 'success', 'message': f'Circle with id {circle_id} updated successfully.'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if conn:
            conn.close()
      
# Fetch data from sql server
def load_csv_data():
    try:
        csv_path = os.path.join(app.static_folder, 'sample_data.csv')
        df = pd.read_csv(csv_path)
        return df
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return None 

@app.route("/")
def hello_world():
    return render_template('index.html')

@app.route('/readonly')
def readonly():
    return render_template('ReadOnly.html')

@app.route('/load_button_names', methods=['GET'])
def load_button_names():
    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT button_id, name FROM button_names")
            button_names = cursor.fetchall()
        return jsonify({
            'status': 'success',
            'buttonNames': button_names
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if connection:
            connection.close()
            
@app.route('/update_button_name', methods=['POST'])
def update_button_name():
    data = request.json
    button_id = data.get('buttonId')
    new_name = data.get('newName')
    
    if not button_id or not new_name:
        return jsonify({'status': 'error', 'message': 'Button ID and new name are required'})
    
    connection = connect_to_database()
    if not connection:
        return jsonify({'status': 'error', 'message': 'Failed to connect to the database'})
    
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE button_names SET name = %s WHERE button_id = %s",
                (new_name, button_id)
            )
            connection.commit()
            
            if cursor.rowcount == 0:
                # Insert if not exists
                cursor.execute(
                    "INSERT INTO button_names (button_id, name) VALUES (%s, %s)",
                    (button_id, new_name)
                )
                connection.commit()
                
        return jsonify({'status': 'success', 'message': 'Button name updated successfully'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})
    finally:
        if connection:
            connection.close()
            
@app.route("/folder")
def folder():
    return render_template('folder.html')
# Fetch demographic data based on zip codes
@app.route("/get_data", methods=["GET"])
def get_data():
    try:
        zip_code = request.args.get('zip_code')
        if not zip_code:
            return jsonify({"success": False, "error": "No ZIP code provided"})
        df = load_csv_data()
        if df is None:
            return jsonify({"success": False, "error": "Could not load CSV data"})
        zip_pattern = f"ZCTA5 {zip_code}"
        matched_data = df[df['Geographic Area Name'] == zip_pattern]
        if matched_data.empty:
            return jsonify({"success": False, "error": f"No data found for ZIP code {zip_code}"})
        row_data = matched_data.iloc[0]
        total_households = int(row_data.get('Households', 0))
        income_less_than_10k = int(row_data.get('Households Less Than $10,000', 0))
        income_10k_15k = int(row_data.get('Households $10,000 to $14,999', 0))
        income_15k_25k = int(row_data.get('Households $15,000 to $24,999', 0))
        income_25k_35k = int(row_data.get('Households $25,000 to $34,999', 0))
        income_35k_50k = int(row_data.get('Households $35,000 to $49,999', 0))
        income_50k_75k = int(row_data.get('Households $50,000 to $74,999', 0))
        income_75k_100k = int(row_data.get('Households $75,000 to $99,999', 0))
        income_100k_150k = int(row_data.get('Households $100,000 to $149,999', 0))
        income_150k_200k = int(row_data.get('Households $150,000 to $199,999', 0))
        income_200k_plus = int(row_data.get('Households $200,000 or More', 0))
        return jsonify({
            "success": True,
            "data": {
                "population": int(row_data.get('Population', 0)),
                "total_households": total_households,
                "income_less_than_10k": income_less_than_10k,
                "income_10k_15k": income_10k_15k,
                "income_15k_25k": income_15k_25k,
                "income_25k_35k": income_25k_35k,
                "income_35k_50k": income_35k_50k,
                "income_50k_75k": income_50k_75k,
                "income_75k_100k": income_75k_100k,
                "income_100k_150k": income_100k_150k,
                "income_150k_200k": income_150k_200k,
                "income_200k_plus": income_200k_plus
            }
        })
    except Exception as e:
        print("Error occurred while processing data:", e)
        return jsonify({"success": False, "error": str(e)})

@app.route("/get_state")
def get_state():
    zip_code = request.args.get('zip_code')
    if not zip_code:
        print("data not recieved as zip code for state")
    state = state_by_zipCode(zip_code)
    print(state)
    if state:
        state_name = state.get("state")
        city_name = state.get("city")
    return jsonify({"success": True, "data": state_name, "city": city_name})

def parse_coordinates(center):
    """Parse and validate the center coordinates"""
    try:
        lat_lng = center.split(',')
        if len(lat_lng) != 2:
            return None, "Invalid center format, expected 'lat,lng'"
        
        lat = float(lat_lng[0])
        lng = float(lat_lng[1])
        
        if not (-90 <= lat <= 90):
            return None, f"Invalid latitude {lat}, must be between -90 and 90"
        if not (-180 <= lng <= 180):
            return None, f"Invalid longitude {lng}, must be between -180 and 180"
            
        return f"{lng},{lat}", None
    except Exception as e:
        return None, f"Error parsing coordinates: {str(e)}"

def make_api_request(url, params, max_retries=3, backoff_factor=0.5):
    """Make API request with retry logic and SSL verification disabled"""
    retry_count = 0
    while retry_count < max_retries:
        try:
            # Disable SSL verification since the certificate has expired
            response = requests.get(url, params=params, timeout=10, verify=False)
            response.raise_for_status()
            return response.json(), None
        except requests.exceptions.RequestException as e:
            retry_count += 1
            if retry_count >= max_retries:
                return None, f"API request failed after {max_retries} attempts: {str(e)}"
            
            # Calculate backoff time with exponential backoff
            wait_time = backoff_factor * (2 ** (retry_count - 1))
            print(f"Retry {retry_count}/{max_retries} for {url} after {wait_time:.2f}s: {str(e)}")
            time.sleep(wait_time)
    
def fetch_population_data(center, radius_meters, api_key=None):
    """Fetch population data using the new RapidAPI service."""
    try:
        # Convert "lat,lng" to lat and lng values
        lng, lat = map(float, center.split(','))

        # Convert radius from string to float, then meters to kilometers
        radius_km = float(radius_meters) / 1000

        url = "https://population-inside-radius.p.rapidapi.com/"
        querystring = {
            "lat": lat,
            "lng": lng,
            "radius": radius_km,
            "year": "2025"
        }

        headers = {
            "x-rapidapi-host": "population-inside-radius.p.rapidapi.com",
            "x-rapidapi-key": "dad2253717mshb69341f1b3f8ccbp11d756jsn0f652ee9304e"  # replace or fetch from env/config
        }

        print(f"Making population API request to {url} with params: {querystring}")
        response = requests.get(url, headers=headers, params=querystring)

        if response.status_code != 200:
            print(f"Population API error: {response.status_code} - {response.text}")
            return None, response.text

        data = response.json()
        population = data.get("population", 0)
        return population, None

    except Exception as e:
        print(f"Exception during population fetch: {e}")
        return None, str(e)


def fetch_income_data(center, radius, api_key):
    """Fetch income data from API"""
    url = "https://osm.buntinglabs.com/v1/census/income"
    params = {
        'center': center,
        'radius': radius,
        'api_key': api_key
    }
    print(f"Making income API request to {url} with params: {params}")
    data, error = make_api_request(url, params)
    
    if error:
        print(f"Income API error: {error}")
        return None, error
    
    median_income = data.get("median_income", 0)
    return median_income, None

@app.route("/fetch_population", methods=["GET"])
def fetch_population():
    try:
        center = request.args.get('center')
        radius = request.args.get('radius')
        if not center or not radius:
            return jsonify({"success": False, "error": "Center and radius are required"})
        api_center, coord_error = parse_coordinates(center)
        if coord_error:
            return jsonify({"success": False, "error": coord_error})
        api_key = "7P6Fr7dpk2i"
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        population, pop_error = fetch_population_data(api_center, radius)
        median_income, income_error = fetch_income_data(api_center, radius, api_key)
        if pop_error and income_error:
            return jsonify({
                "success": False, 
                "error": f"Both API endpoints failed. Population error: {pop_error}. Income error: {income_error}",
                "data": {
                    "population": 0,
                    "median_income": 0
                }
            })
        elif pop_error:
            return jsonify({
                "success": True,
                "warning": f"Population data failed: {pop_error}",
                "data": {
                    "population": 0,
                    "median_income": median_income or 0
                }
            })
        elif income_error:
            return jsonify({
                "success": True,
                "warning": f"Income data failed: {income_error}",
                "data": {
                    "population": population or 0,
                    "median_income": 0
                }
            })
        return jsonify({
            "success": True,
            "data": {
                "population": population or 0,
                "median_income": median_income or 0
            }
        })        
    except Exception as e:
        import traceback
        print(f"Unexpected error: {e}")
        print(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)})


@app.route("/nearbysearch", methods=["GET"])
def nearby_search():
    location = request.args.get("location")  
    radius = request.args.get("radius")  
    type_ = request.args.get("type", "post_office")  

    if not location or not radius:
        return jsonify({"error": "Missing required parameters: location and radius"}), 400
    print(f"Received location: {location}, radius: {radius}, type: {type_}")
    url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": location,
        "radius": radius,
        "type": type_,
        "key": API_KEY,
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return jsonify(data)
    except requests.exceptions.RequestException as e:
        print("Error fetching Places API:", e)
        return jsonify({"error": "Failed to fetch data from Google Places API"}), 500

# Write new zip codes to csv
@app.route("/save_postal", methods=["GET","POST"])
def save_postal():
    data = request.form
    new_data = list()
    for dtt in data.get('total_data'):
        
        new_data.append({'lat': dtt.get('latLng').get('lat'), 'lng': dtt.get('latLng').get('lng'),
                         'postal_code': dtt.get('postalCode'), 'place_id': dtt.get('place_id')})

    with open('postal_number.csv', 'a', newline='') as output_file:
        dict_writer = csv.DictWriter(output_file, ['lat', 'lng', 'postal_code', 'place_id'])
        dict_writer.writerows(new_data)
    return jsonify({'success':True})

# Fetch postal codes from csv
@app.route("/load_postal", methods=["GET","POST"])
def load_postal():
    data = eval(request.form.get('total_data'))
    df = pd.read_csv("postal_number.csv")
    df = df.drop_duplicates()
    count = 0
    retrieved_data = list()
    data_missed = list()
    missing_data_count = 0
    retrieve_data_count = 0
    api_new_data = list()
    for dtt in data:
        if dtt != '':
            if not df.loc[df['place_id'] == dtt].empty:
                result = df.loc[df['place_id'] == dtt].iloc[0]
                result = result.tolist()
                latlng = json.dumps({'lat':result[0],'lng':result[1]})
                retrieved_data.append([ latlng,str(result[2]),str(result[3])])
                if retrieve_data_count == 0:
                    retrieve_data_count+=1
    #         else:
    #             if missing_data_count < 10:
    #                 missing_data_count += 1
    #                 api_data = get_place_details(dtt)
    #                 latlng = json.dumps(api_data.get('lat_lng'))
    #                 postal_code = api_data.get('postal_code')
    #                 api_new_data.append({"lat":api_data.get('lat_lng').get('lat'),
    #                                      "lng":api_data.get('lat_lng').get('lng'),
    #                                      "postal_code":str(postal_code),"place_id":str(dtt)})
    #                 retrieved_data.append([latlng,str(postal_code), str(dtt)])
    #                 print( [latlng,str(postal_code), str(dtt)],'api---first'  )
    
    #     count +=1
    # with open('postal_number.csv', 'a', newline='') as output_file:
        # dict_writer = csv.DictWriter(output_file, ['lat', 'lng', 'postal_code', 'place_id'])
        # dict_writer.writerows(api_new_data)
    return jsonify({'success':True,'retrieved_data':json.dumps(retrieved_data)})


# Get detailed information places using google APIs
def get_place_details(place_id):
    api_key = 'AIzaSyCmxt9MdmhDOTDpVz3xLriP_uIe8bCTApc'
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        'place_id': place_id,
        'fields': 'address_components,geometry',
        'key': api_key
    }
    response = requests.get(url, params=params)
    if response.status_code == 200:
        result = response.json()
        if result['status'] == 'OK':
            place = result['result']

            postal_component = next((component for component in place['address_components']
                                     if 'postal_code' in component['types']), None)
            if postal_component:
                postal_code = postal_component['long_name']
                lat_lng = place['geometry']['location']
                print(f"Postal Code: {postal_code}")
                print(f"Latitude/Longitude: {lat_lng}")
                return dict(postal_code=postal_code,lat_lng=lat_lng)

        else:
            print("Error:", result['status'])
    else:
        print("Failed to retrieve data:", response.status_code)


if __name__ == "__main__":
    app.run(host='localhost', port=5000, debug=True)
    