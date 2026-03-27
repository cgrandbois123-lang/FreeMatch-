import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { PanResponder, Animated } from 'react-native';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const LikeMatchScreen = ({ userToken }) => {
    const [users, setUsers] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const pan = new Animated.ValueXY();

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }]),
        onPanResponderRelease: (e, { vx }) => {
            if (vx > 0.5) {
                likeUser();
            } else if (vx < -0.5) {
                rejectUser();
            } else {
                Animated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: false
                }).start();
            }
        },
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/discovery/discover?limit=10`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setUsers(response.data);
            setCurrentIndex(0);
        } catch (error) {
            Alert.alert('Error', 'Failed to load users');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const likeUser = async () => {
        if (currentIndex >= users.length) return;
        const likedUserId = users[currentIndex].id;
        try {
            const response = await axios.post(`${API_BASE_URL}/likes/like`, {
                liked_id: likedUserId
            }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            if (response.data.matched) {
                Alert.alert('Match!', `You matched with ${users[currentIndex].first_name}!`);
            }
            moveToNext();
        } catch (error) {
            Alert.alert('Error', 'Failed to like user');
            console.error(error);
        }
    };

    const rejectUser = async () => {
        moveToNext();
    };

    const moveToNext = () => {
        setCurrentIndex(currentIndex + 1);
        pan.setValue({ x: 0, y: 0 });
        if (currentIndex + 1 >= users.length) {
            fetchUsers();
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#FF6B6B" />
            </View>
        );
    }

    if (currentIndex >= users.length || users.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.noUsersText}>No more users to discover</Text>
            </View>
        );
    }

    const currentUser = users[currentIndex];

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            <Animated.View style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}> 
                <Image source={{ uri: currentUser.profile_photo_url }} style={styles.image} />
                <View style={styles.cardContent}> 
                    <Text style={styles.name}>{currentUser.first_name}, {currentUser.age}</Text>
                    <Text style={styles.bio}>{currentUser.bio}</Text>
                    <Text style={styles.location}>{currentUser.location}</Text>
                </View>
            </Animated.View>
            <View style={styles.instructions}> 
                <Text style={styles.instructionText}>← Swipe left to skip</Text> 
                <Text style={styles.instructionText}>Swipe right to like →</Text> 
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        height: '70%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
    },
    image: {
        width: '100%',
        height: '70%',
        resizeMode: 'cover',
    },
    cardContent: {
        padding: 15,
        height: '30%',
        justifyContent: 'space-around',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    bio: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    location: {
        fontSize: 12,
        color: '#999',
        marginTop: 5,
    },
    instructions: {
        marginTop: 30,
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    instructionText: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
    noUsersText: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
    },
});

export default LikeMatchScreen;